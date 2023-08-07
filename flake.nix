{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    rust-overlay.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = { self, nixpkgs, rust-overlay, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [
          (import rust-overlay)
          (final: prev: { nodejs = prev.nodejs-18_x; })
        ];
        pkgs = import nixpkgs { inherit system overlays; };

        # workaround for rust compile failed with
        #   ld: framework not found Security
        # source:
        # https://discourse.nixos.org/t/compile-a-rust-binary-on-macos-dbcrossbar/8612
        securityFrameworks = if pkgs.stdenv.isDarwin then [
          pkgs.darwin.apple_sdk.frameworks.Security
          pkgs.darwin.apple_sdk.frameworks.SystemConfiguration
        ] else
          [ ];
        rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
      in with pkgs; {
        packages.server = pkgs.rustPlatform.buildRustPackage {
          pname = "server";
          nativeBuildInputs = [ pkgs.pkg-config rust ] ++ securityFrameworks;
          version = "0.0.0";
          src = ./.;
          cargoBuildFlags = "-p server";
          doCheck = false;
          cargoLock = {
            lockFile = ./Cargo.lock;
            outputHashes = {
              "ts-rs-6.2.0" =
                "sha256-3FVqiUDB9DZe6WpseNaac/Lxxv2CALMao8x8xmEAGvc=";
            };
          };

          PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
        };

        packages.manage = pkgs.rustPlatform.buildRustPackage {
          pname = "manage-cli";
          nativeBuildInputs = [ pkgs.pkg-config rust ] ++ securityFrameworks;
          version = "0.0.0";
          src = ./.;
          cargoBuildFlags = "-p manage-cli";
          doCheck = false;
          cargoLock = {
            lockFile = ./Cargo.lock;
            outputHashes = {
              "ts-rs-6.2.0" =
                "sha256-3FVqiUDB9DZe6WpseNaac/Lxxv2CALMao8x8xmEAGvc=";
            };
          };

          PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
        };

        devShells.default = mkShell {
          buildInputs = [ rust nodejs just nodePackages.pnpm ]
            ++ securityFrameworks;
          nativeBuildInputs = [ pkgs.pkg-config ];
          PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
        };
      });
}
