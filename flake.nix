{
  description = "A chat tool made for play RPG";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    crane = {
      url = "github:ipetkov/crane";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs @ { flake-parts, crane, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.devshell.flakeModule
        inputs.treefmt-nix.flakeModule
      ];

      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      perSystem = { config, self', inputs', pkgs, system, ... }:
        let
          inherit (pkgs) lib stdenv;
          targets = [ "wasm32-unknown-unknown" "x86_64-unknown-linux-gnu" ];

          rustToolchain = pkgs.rust-bin.stable.latest.default.override {
            extensions = [ "rust-src" ];
            inherit targets;
          };

          craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

          darwinInputs = with pkgs; lib.optionals stdenv.isDarwin [
            libiconv
            darwin.apple_sdk.frameworks.Security
            darwin.apple_sdk.frameworks.SystemConfiguration
            darwin.apple_sdk.frameworks.CoreFoundation
          ];

          src =
            let
              srcFilter = path: _type: builtins.match ".*src/.*$" path != null;
              versionFile = path: _type: builtins.match ".*version.json$" path != null;
              schemaFile = path: _type: builtins.match ".*schema.sql$" path != null;
              filter = path: type:
                (srcFilter path type) || (craneLib.filterCargoSources path type) || (versionFile path type) || (schemaFile path type);
            in
            pkgs.lib.cleanSourceWith {
              src = craneLib.path ./.;
              inherit filter;
            };


          commonArgs = {
            pname = "boluo-deps";
            version = "0.0.0";

            inherit src;
            strictDeps = true;

            nativeBuildInputs = [ pkgs.pkg-config ];
            buildInputs = [ ] ++ darwinInputs;
          };

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
                version = "0.0.0";

                doCheck = false;
                inherit cargoArtifacts;
                cargoExtraArgs = "--package=server";
              }
            );
            server-image = pkgs.dockerTools.buildLayeredImage {
              name = "boluo-server";
              tag = "latest";
              contents = [
                pkgs.cacert
              ];
              config = {
                Cmd = [ "${self'.packages.server}/bin/server" ];
              };
            };
          };

          checks = {
            # Run clippy (and deny all warnings) on the crate source,
            # again, resuing the dependency artifacts from above.
            #
            # Note that this is done as a separate derivation so that
            # we can block the CI if there are issues here, but not
            # prevent downstream consumers from building our crate by itself.
            crate-clippy = craneLib.cargoClippy (commonArgs
              // {
              inherit cargoArtifacts;
              cargoClippyExtraArgs = "--all-targets -- --deny warnings";
            });

            crate-doc = craneLib.cargoDoc (commonArgs
              // {
              inherit cargoArtifacts;
            });

            # Check formatting
            crate-fmt = craneLib.cargoFmt {
              inherit src;
            };
          };

          devshells.default = {
            packages =
              let
                common = with pkgs; [
                  config.treefmt.build.wrapper
                  rust-analyzer
                  rustToolchain
                  nil
                  nodejs
                  nodePackages.pnpm
                  clang
                  gnumake
                ];
              in
              common ++ darwinInputs;
            packagesFrom = [ self'.packages.server ];
            # https://github.com/cachix/devenv/issues/267
            env = [
              { name = "PKG_CONFIG_PATH"; eval = "$DEVSHELL_DIR/lib/pkgconfig"; }
              {
                name = "LIBRARY_PATH";
                eval = "$DEVSHELL_DIR/lib";
              }
              {
                name = "CFLAGS";
                eval = "\"-I $DEVSHELL_DIR/include ${lib.optionalString pkgs.stdenv.isDarwin "-iframework $DEVSHELL_DIR/Library/Frameworks"}\"";
              }
            ] ++ lib.optionals pkgs.stdenv.isDarwin [
              {
                name = "RUSTFLAGS";
                eval = "\"-L framework=$DEVSHELL_DIR/Library/Frameworks\"";
              }
              {
                name = "RUSTDOCFLAGS";
                eval = "\"-L framework=$DEVSHELL_DIR/Library/Frameworks\"";
              }
            ];
          };

          treefmt = {
            projectRootFile = "flake.nix";
            programs = {
              nixpkgs-fmt.enable = true;
              rustfmt.enable = true;
              prettier.enable = true;
            };
          };
        };
    };
}
