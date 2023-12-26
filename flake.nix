{
  description = "A nfo file generator for your anime. Source from Bangumi.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    devshell.url = "github:numtide/devshell";
    crane = {
      url = "github:ipetkov/crane";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    rust-overlay.url = "github:oxalica/rust-overlay";
    treefmt-nix.url = "github:numtide/treefmt-nix";
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
          targets = [ "wasm32-unknown-unknown" "x86_64-unknown-linux-gnu" ];

          rustToolchain = pkgs.rust-bin.stable.latest.default.override {
            extensions = [ "rust-src" ];
            inherit targets;
          };

          craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

          src =
            let
              srcFilter = path: _type: builtins.match ".*src/.*$" path != null;
              versionFile = path: _type: builtins.match ".*version.json$" path != null;
              srcOrCargo = path: type:
                (srcFilter path type) || (craneLib.filterCargoSources path type) || (versionFile path type);
            in
            pkgs.lib.cleanSourceWith {
              src = craneLib.path ./.;
              filter = srcOrCargo;
            };


          commonArgs = {
            pname = "boluo-deps";
            version = "0.0.0";

            inherit src;
            strictDeps = true;

            nativeBuildInputs = with pkgs; [ pkg-config ];
            buildInputs = with pkgs;
              let
                securityFrameworks =
                  if stdenv.isDarwin then [
                    darwin.apple_sdk.frameworks.Security
                    darwin.apple_sdk.frameworks.SystemConfiguration
                  ] else [ ];
              in
              [ openssl ] ++ securityFrameworks;
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
            packages = with pkgs; [
              clang
              config.treefmt.build.wrapper
              rust-analyzer
              rustToolchain
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
