{
  description = "A chat tool made for play RPG";
  nixConfig = {
    extra-substituters = [
      "https://boluo.cachix.org"
    ];
    extra-trusted-public-keys = [
      "boluo.cachix.org-1:03yc2Do5i+RFofJNpy7GPOCvYv4wHKEnnQTgFvP6o2Q="
    ];
  };
  inputs = {
    nixpkgs = {
      url = "github:NixOS/nixpkgs/nixos-unstable";
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
      self,
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
          rev = if (self ? rev) then self.rev else lib.warn "Dirty workspace" "unknown";
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

          commonEnv = [
            "GIT_SSL_CAINFO=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            "SSL_CERT_FILE=${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
            "APP_VERSION=${rev}"
          ];

          imageLabel = {
            "org.opencontainers.image.url" = "https://github.com/mythal/boluo";
            "org.opencontainers.image.version" = version;
            "org.opencontainers.image.revision" = rev;
            "org.opencontainers.image.vendor" = "Mythal";
            "org.opencontainers.image.licenses" = "AGPL-3.0";
          };

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
                env = commonEnv;
                Cmd = [ "${self'.packages.server}/bin/server" ];
                Labels = imageLabel;
              };
            };

            legacy = import ./support/legacy.nix common;

            legacy-image = import ./support/legacy-image.nix {
              inherit pkgs imageLabel;
              legacy = self'.packages.legacy;
            };

            site = import ./support/site.nix common;

            site-image = import ./support/site-image.nix {
              boluo-site = self'.packages.site;
              inherit
                pkgs
                commonEnv
                commonImageContents
                imageLabel
                ;
            };

            spa = import ./support/spa.nix common;

            spa-image = import ./support/spa-image.nix {
              inherit pkgs imageLabel;
              boluo-spa = self'.packages.spa;
            };

            push-images = pkgs.writeShellScriptBin "push-images" ''
              set -e
              skopeo login ghcr.io -u $GITHUB_ACTOR -p $GITHUB_TOKEN
              IMAGE_TAG="$(${pkgs.python3}/bin/python3 ${./support/image-tag.py})"
              echo "Pushing images with tag: $IMAGE_TAG"
              BASE="docker://ghcr.io/mythal/boluo"
              ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.server-image}" $BASE/server:$IMAGE_TAG
              ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.legacy-image}" $BASE/legacy:$IMAGE_TAG
              ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.site-image}" $BASE/site:$IMAGE_TAG
              ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.spa-image}" $BASE/spa:$IMAGE_TAG
            '';

            deploy-server-staging = pkgs.writeShellScriptBin "deploy-server-staging" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/server/fly.staging.toml} --remote-only
            '';

            deploy-server-production = pkgs.writeShellScriptBin "deploy-server-production" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/server/fly.toml} --remote-only
            '';

            deploy-site-staging = pkgs.writeShellScriptBin "deploy-site-staging" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/site/fly.staging.toml} --remote-only
            '';

            deploy-site-production = pkgs.writeShellScriptBin "deploy-site-production" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/site/fly.toml} --remote-only
            '';
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
              flyctl
              nix-fast-build
              nix-output-monitor
            ];
            shellHook = ''
              export PATH="node_modules/.bin:$PATH"
            '';
          };
        };
    };
}
