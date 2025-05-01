{
  description = "A chat tool made for play RPG";

  inputs = {
    nixpkgs = {
      url = "github:mythal/nixpkgs/production";
    };
    flake-parts.url = "github:hercules-ci/flake-parts";
    crane = {
      url = "github:ipetkov/crane";
    };
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{
      flake-parts,
      crane,
      ...
    }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
      ];

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
        "x86_64-darwin"
      ];
      perSystem =
        {
          config,
          self',
          inputs',
          pkgs,
          system,
          ...
        }:
        let
          inherit (pkgs) lib stdenv;
          version = "0.0.0";
          npmApps = [
            "legacy"
            "spa"
            "site"
          ];
          pruneSource =
            name:
            pkgs.stdenvNoCC.mkDerivation {
              name = "boluo-${name}-source";
              src = lib.cleanSource ./.;
              __contentAddressed = true;

              outputHashMode = "recursive";
              outputHashAlgo = "sha256";

              TURBO_TELEMETRY_DISABLED = 1;
              installPhase = ''
                ${pkgs.turbo}/bin/turbo prune ${name}
                mkdir -p $out
                cp -r out/* $out
              '';
            };

          common = {
            inherit pkgs;
            inherit version;
            inherit pruneSource;
            mkNpmDeps =
              src:
              pkgs.importNpmLock {
                pname = "${src.name}-deps";
                npmRoot = src;
                version = version;
              };
          };

          rustToolchain = pkgs.rust-bin.selectLatestNightlyWith (
            toolchain:
            toolchain.default.override {
              extensions = [
                "rust-src"
                "rust-analyzer"
              ];
            }
          );

          craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

          commonImageContents = with pkgs.dockerTools; [
            usrBinEnv
            binSh
            pkgs.cacert
            caCertificates
            fakeNss
          ];

          certEnv = [
            "GIT_SSL_CAINFO=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
          ];

          cargo-source =
            let
              filters = [
                (path: _type: lib.hasSuffix "Cargo.toml" path)
                (path: _type: lib.hasInfix "/.sqlx/" path)
                (path: _type: lib.hasInfix "/apps/server/migrations/" path)
                (path: _type: lib.hasInfix "/apps/server/sql/" path)
                (path: _type: lib.hasInfix "/apps/server/src/" path)
                (path: _type: lib.hasInfix "/apps/server/text/" path)
                craneLib.filterCargoSources
                (path: _type: lib.hasSuffix "/apps/server/schema.sql" path)
              ];
            in
            pkgs.lib.cleanSourceWith {
              src = craneLib.path ./.;
              filter = path: type: builtins.any (f: f path type) filters;
            };

          commonArgs = {
            src = cargo-source;
            inherit version;
            strictDeps = true;

            nativeBuildInputs = [ pkgs.pkg-config ];
            buildInputs = [ ];
          };

          # Build *just* the cargo dependencies (of the entire workspace),
          # so we can reuse all of that work (e.g. via cachix) when running in CI
          # It is *highly* recommended to use something like cargo-hakari to avoid
          # cache misses when building individual top-level-crates
          cargoArtifacts = craneLib.buildDepsOnly commonArgs;
        in
        {
          _module.args.pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [
              inputs.rust-overlay.overlays.default
            ];
            config = { };
          };

          packages = {
            server = craneLib.buildPackage (
              commonArgs
              // {
                pname = "server";

                inherit cargoArtifacts version;
                cargoExtraArgs = "--package=server";
              }
            );
            server-image = pkgs.dockerTools.buildLayeredImage {
              name = "boluo-server";
              tag = "latest";
              contents = commonImageContents;
              config = {
                env = certEnv;
                Cmd = [ "${self'.packages.server}/bin/server" ];
              };
            };

            legacy = import ./support/legacy.nix common;

            legacy-image = import ./support/legacy-image.nix {
              inherit pkgs;
              legacy = self'.packages.legacy;
            };

            site = import ./support/site.nix common;

            site-image = import ./support/site-image.nix {
              boluo-site = self'.packages.site;
              inherit pkgs certEnv commonImageContents;
            };

            spa = import ./support/spa.nix common;

            spa-image = import ./support/spa-image.nix {
              inherit pkgs;
              boluo-spa = self'.packages.spa;
            };
          };

          checks = {
            server = self'.packages.server;
            legacy = self'.packages.legacy;
            site = self'.packages.site;
            spa = self'.packages.spa;
          };
          devShells.default = pkgs.mkShell {
            buildInputs = with pkgs; [
              rustToolchain
              nil
              nodejs
              clang
              pgformatter
              gnumake
              nixfmt-rfc-style
              sqlx-cli
              prefetch-npm-deps
            ];
            shellHook = ''
              export PATH="node_modules/.bin:$PATH"
            '';
          };
        };
    };
}
