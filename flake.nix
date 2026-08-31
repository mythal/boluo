# Reference:
# - https://crane.dev/index.html
# - https://nixos.org/manual/nixpkgs/unstable/#sec-pkgs-dockerTools
# - https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/build-support/docker/examples.nix
{
  description = "A chat tool made for play RPG";
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
          unfilteredRoot = ./.;

          npmWorkspaceLib = import ./packages/nix-workspaces/npm.nix {
            inherit pkgs;
            root = unfilteredRoot;
            rootDependencyNames = [ "turbo" ];
            extraSourceFiles = [ (unfilteredRoot + "/turbo.json") ];
          };

          cargoWorkspaceLib = import ./packages/nix-workspaces/cargo.nix {
            inherit pkgs;
            root = unfilteredRoot;
            extraSourceFiles =
              target:
              lib.optionals (target == "server") [
                ./apps/db/schema.sql
                ./.sqlx
                ./.config/nextest.toml
                ./scripts/setup-test-db.sh
              ];
          };

          mkStaticSpaImage = import ./packages/nix-static-spa-image { inherit pkgs; };

          frontendBuildArgs =
            target:
            let
              src = npmWorkspaceLib.sourceFor target;
              npmDeps = npmWorkspaceLib.mkNpmDepsFor target {
                pname = "boluo-${target}-npm-deps";
                inherit version;
              };
              frontendVersion = builtins.substring 0 40 (builtins.hashString "sha256" "${src}:${npmDeps}");
            in
            {
              pname = "boluo-${target}";
              inherit src npmDeps version;
              npmConfigHook = pkgs.importNpmLock.npmConfigHook;
              TURBO_TELEMETRY_DISABLED = 1;
              NEXT_TELEMETRY_DISABLED = 1;
              APP_VERSION = frontendVersion;
              npmBuildScript = "build:${target}";
              passthru = {
                inherit frontendVersion;
              };
            };

          mkFrontendRelease =
            {
              includeStorybook ? false,
            }:
            pkgs.runCommand "boluo-frontend-release${lib.optionalString includeStorybook "-staging"}" { } ''
              mkdir -p \
                $out/.frontend-versions \
                $out/apps/legacy/dist \
                $out/apps/spa/out \
                $out/packages/backend-proxy/dist

              cp -r ${self'.packages.legacy}/. $out/apps/legacy/dist/
              cp -r ${self'.packages.spa}/. $out/apps/spa/out/
              cp -r ${self'.packages.spa.backendProxy}/. $out/packages/backend-proxy/dist/
              cp -r ${self'.packages.siteBuild.worker}/. $out/

              printf '%s\n' '${self'.packages.legacy.frontendVersion}' > $out/.frontend-versions/legacy
              printf '%s\n' '${self'.packages.spa.frontendVersion}' > $out/.frontend-versions/spa
              printf '%s\n' '${self'.packages.siteBuild.frontendVersion}' > $out/.frontend-versions/site

              ${lib.optionalString includeStorybook ''
                mkdir -p $out/apps/storybook/storybook-static
                cp -r ${self'.packages.storybook}/. $out/apps/storybook/storybook-static/
                printf '%s\n' '${self'.packages.storybook.frontendVersion}' > $out/.frontend-versions/storybook
              ''}
            '';

          rustToolchain = pkgs.rust-bin.selectLatestNightlyWith (
            toolchain:
            toolchain.default.override {
              extensions = [ "rust-src" ];
            }
          );

          rustfmtToolchain = pkgs.rust-bin.selectLatestNightlyWith (
            toolchain:
            toolchain.minimal.override {
              extensions = [ "rustfmt" ];
            }
          );

          pulumiToolchain = pkgs.pulumi.withPackages (pulumiPackages: [ pulumiPackages.pulumi-nodejs ]);

          craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

          imageLabel = {
            "org.opencontainers.image.url" = "https://github.com/mythal/boluo";
            "org.opencontainers.image.version" = version;
            "org.opencontainers.image.vendor" = "Mythal";
            "org.opencontainers.image.licenses" = "AGPL-3.0";
          };

          mkPushImage =
            { imageName, imageArchive }:
            pkgs.writeShellScriptBin "push-${imageName}-image" ''
              set -euo pipefail

              TMPDIR="''${TMPDIR:-/tmp}"
              REGISTRY_TEMP_DIR="$(${pkgs.coreutils}/bin/mktemp -d "$TMPDIR/boluo-skopeo.XXXXXX")"
              trap '${pkgs.coreutils}/bin/rm -rf "$REGISTRY_TEMP_DIR"' EXIT

              export XDG_CONFIG_HOME="$REGISTRY_TEMP_DIR/config"
              export XDG_RUNTIME_DIR="$REGISTRY_TEMP_DIR/runtime"
              ${pkgs.coreutils}/bin/mkdir -p "$XDG_CONFIG_HOME/containers" "$XDG_RUNTIME_DIR"
              ${pkgs.coreutils}/bin/chmod 700 "$XDG_RUNTIME_DIR"
              ${pkgs.coreutils}/bin/printf '%s\n' \
                'unqualified-search-registries = []' \
                'short-name-mode = "disabled"' \
                > "$XDG_CONFIG_HOME/containers/registries.conf"

              AUTH_FILE="$XDG_CONFIG_HOME/containers/auth.json"
              ${pkgs.skopeo}/bin/skopeo login --authfile "$AUTH_FILE" ghcr.io -u "$GITHUB_ACTOR" -p "$GITHUB_TOKEN"
              : "''${GITHUB_SHA:?GITHUB_SHA must be set}"
              IMAGE_TAG="$(${pkgs.python3}/bin/python3 ${./scripts/image-tag.py})"
              IMAGE_DESTINATION="ghcr.io/mythal/boluo/${imageName}"
              echo "Pushing ${imageName} image with tag: $IMAGE_TAG"
              ${pkgs.skopeo}/bin/skopeo copy --dest-authfile "$AUTH_FILE" docker-archive:"${imageArchive}" "docker://$IMAGE_DESTINATION:$IMAGE_TAG"
              ${pkgs.skopeo}/bin/skopeo copy --dest-authfile "$AUTH_FILE" docker-archive:"${imageArchive}" "docker://$IMAGE_DESTINATION:v''${GITHUB_SHA}"
            '';

          commonArgs = target: {
            src = cargoWorkspaceLib.sourceFor target;
            inherit version;
            strictDeps = true;

            buildInputs = [ ];
            nativeBuildInputs = [
              pkgs.sccache
              pkgs.clang
            ]
            ++ lib.optionals stdenv.hostPlatform.isLinux [ pkgs.wild ];
            RUSTC_WRAPPER = "${pkgs.sccache}/bin/sccache";
            SCCACHE_DIR = "/tmp/sccache";
          };

          bridgeCommonArgs = commonArgs "bridge";
          serverCommonArgs = (commonArgs "server") // {
            RUSTFLAGS = "--cfg tracing_unstable";
          };

          bridgeReleaseArtifacts = craneLib.buildDepsOnly (
            bridgeCommonArgs
            // {
              pname = "bridge";
              cargoExtraArgs = "--locked --package=bridge";
              cargoCheckCommand = "true";
              doCheck = false;
              SQLX_OFFLINE = "true";
            }
          );

          # CI checks only need the test profile.
          bridgeTestArtifacts = craneLib.buildDepsOnly (
            bridgeCommonArgs
            // {
              pname = "bridge-tests";
              CARGO_PROFILE = "";
              cargoExtraArgs = "--locked --package=bridge";
              cargoCheckCommand = "true";
              cargoBuildCommand = "true";
              cargoTestCommand = "cargo nextest run";
              cargoTestExtraArgs = "--no-run";
              SQLX_OFFLINE = "true";
              nativeBuildInputs = bridgeCommonArgs.nativeBuildInputs ++ [ pkgs.cargo-nextest ];
            }
          );

          bridgeCheck = craneLib.cargoNextest (
            bridgeCommonArgs
            // {
              pname = "bridge";
              cargoArtifacts = bridgeTestArtifacts;
              CARGO_PROFILE = "";
              cargoExtraArgs = "--locked --package=bridge";
              SQLX_OFFLINE = "true";
              nativeBuildInputs = bridgeCommonArgs.nativeBuildInputs ++ [ pkgs.cargo-nextest ];
            }
          );

          serverReleaseArtifacts = craneLib.buildDepsOnly (
            serverCommonArgs
            // {
              pname = "server";
              cargoExtraArgs = "--locked --package=server";
              cargoCheckCommand = "true";
              doCheck = false;
            }
          );

          # CI checks only need the test profile.
          serverTestArtifacts = craneLib.buildDepsOnly (
            serverCommonArgs
            // {
              pname = "server-tests";
              CARGO_PROFILE = "";
              cargoExtraArgs = "--locked --package=server";
              cargoCheckCommand = "true";
              cargoBuildCommand = "true";
              cargoTestCommand = "cargo nextest run";
              cargoTestExtraArgs = "--no-run";
              nativeBuildInputs = serverCommonArgs.nativeBuildInputs ++ [ pkgs.cargo-nextest ];
            }
          );

          serverCheck = craneLib.cargoNextest (
            serverCommonArgs
            // {
              pname = "server";
              cargoArtifacts = serverTestArtifacts;
              CARGO_PROFILE = "";
              cargoExtraArgs = "--locked --package=server";
              cargoNextestExtraArgs = "--retries 2";
              nativeBuildInputs = serverCommonArgs.nativeBuildInputs ++ [
                pkgs.postgresql
                pkgs.cargo-nextest
              ];
            }
          );
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
              serverCommonArgs
              // {
                pname = "server";

                cargoArtifacts = serverReleaseArtifacts;
                cargoExtraArgs = "--locked --package=server";
                doCheck = false;
                nativeBuildInputs = serverCommonArgs.nativeBuildInputs ++ [
                  pkgs.postgresql
                ];
                preBuild = ''
                  export PGDATA=$(mktemp -d)
                  initdb --no-locale --encoding=UTF8 --username=postgres
                  pg_ctl start -o "-k $PGDATA -h '''"
                  createdb -h "$PGDATA" -U postgres boluo_test
                  psql -h "$PGDATA" -U postgres -d boluo_test -v ON_ERROR_STOP=1 -f ${./apps/db/schema.sql}
                  export DATABASE_URL="postgresql:///boluo_test?host=$PGDATA&user=postgres"
                '';
                postInstall = ''
                  pg_ctl stop -D "$PGDATA"
                '';
              }
            );

            # The bridge stores state in SQLite and verifies its queries against
            # the committed `crates/bridge/.sqlx` cache, so it needs no database at
            # build time.
            bridge = craneLib.buildPackage (
              bridgeCommonArgs
              // {
                pname = "bridge";

                cargoArtifacts = bridgeReleaseArtifacts;
                cargoExtraArgs = "--locked --package=bridge";
                doCheck = false;
                SQLX_OFFLINE = "true";
              }
            );

            base-image = pkgs.dockerTools.buildImage {
              name = "boluo-base";
              tag = "latest";
              copyToRoot = pkgs.buildEnv {
                name = "boluo-base-root";
                paths = with pkgs; [
                  busybox
                  bashInteractive
                  pgcli
                  dockerTools.caCertificates
                  dockerTools.fakeNss
                ];
              };
              config = {
                Env = [
                  "PATH=/bin:/usr/bin"
                ];
                Cmd = [ "/bin/bash" ];
                Labels = imageLabel;
              };
            };

            server-image = pkgs.dockerTools.buildImage {
              name = "boluo-server";
              tag = "latest";
              fromImage = self'.packages.base-image;
              copyToRoot = pkgs.buildEnv {
                name = "boluo-server-root";
                paths = with pkgs; [
                  self'.packages.server
                ];
              };
              config = {
                Cmd = [
                  "/bin/server"
                  "serve"
                ];
                Labels = imageLabel;
              };
            };

            legacy = pkgs.buildNpmPackage (
              frontendBuildArgs "legacy"
              // {
                installPhase = ''
                  mkdir -p $out
                  cp -r apps/legacy/dist/* $out/
                '';
              }
            );

            siteBuild = pkgs.buildNpmPackage (
              frontendBuildArgs "site"
              // {
                outputs = [
                  "out"
                  "worker"
                ];
                postBuild = ''
                  (cd apps/site && ../../node_modules/.bin/opennextjs-cloudflare build --skipNextBuild)
                '';
                installPhase = ''
                  mkdir -p $out $worker/apps/site/.open-next
                  cp -r apps/site/.next/standalone/* $out/
                  cp -r apps/site/.next/static $out/apps/site/.next/static
                  cp -r apps/site/.open-next/. $worker/apps/site/.open-next/
                '';
              }
            );

            site-worker = self'.packages.siteBuild.worker;

            legacy-image = mkStaticSpaImage {
              name = "boluo-legacy";
              webRoot = self'.packages.legacy;
              labels = imageLabel;
            };

            site =
              let
                raw = self'.packages.siteBuild;
              in
              pkgs.runCommand "boluo-site" { } ''
                mkdir -p $out/bin
                cp -r ${raw}/* $out/
                echo '#!/bin/sh' > $out/bin/boluo-site
                echo 'exec ${pkgs.nodejs}/bin/node "$(dirname "$0")/../apps/site/server.js"' >> $out/bin/boluo-site
                chmod +x $out/bin/boluo-site
              '';

            site-image = pkgs.dockerTools.buildImage {
              name = "boluo-site";
              tag = "latest";
              fromImage = self'.packages.base-image;
              copyToRoot =
                with pkgs;
                buildEnv {
                  name = "boluo-site-root";
                  paths = [
                    curl
                    nodejs
                  ];
                };
              runAsRoot = ''
                cp -r ${self'.packages.site} /app
              '';
              config = {
                Env = [
                  "NEXT_TELEMETRY_DISABLED=1"
                  "NODE_ENV=production"
                ];
                Cmd = [
                  "node"
                  "/app/apps/site/server.js"
                ];
                Labels = imageLabel;
              };
            };

            spa = pkgs.buildNpmPackage (
              frontendBuildArgs "spa"
              // {
                outputs = [
                  "out"
                  "backendProxy"
                ];
                installPhase = ''
                  mkdir -p $out $backendProxy
                  cp -r apps/spa/out/* $out/
                  cp -r packages/backend-proxy/dist/* $backendProxy/
                '';
              }
            );

            backend-proxy = self'.packages.spa.backendProxy;

            storybook = pkgs.buildNpmPackage (
              frontendBuildArgs "boluo-storybook"
              // {
                pname = "boluo-storybook";
                npmBuildScript = "build:storybook";
                installPhase = ''
                  mkdir -p $out
                  cp -r apps/storybook/storybook-static/* $out/
                '';
              }
            );

            frontend-release = mkFrontendRelease { };

            frontend-release-staging = mkFrontendRelease {
              includeStorybook = true;
            };

            spa-image = mkStaticSpaImage {
              name = "boluo-spa";
              webRoot = self'.packages.spa;
              labels = imageLabel;
            };

            push-server-image = mkPushImage {
              imageName = "server";
              imageArchive = self'.packages.server-image;
            };

            push-site-image = mkPushImage {
              imageName = "site";
              imageArchive = self'.packages.site-image;
            };

            deploy-server-staging = pkgs.writeShellScriptBin "deploy-server-staging" ''
              set -euo pipefail
              : "''${APP_VERSION:?APP_VERSION must be set}"
              ${pkgs.flyctl}/bin/flyctl deploy --config ${crates/server/fly.toml} --image "ghcr.io/mythal/boluo/server:v''${APP_VERSION}" --env "APP_VERSION=''${APP_VERSION}" --remote-only
            '';

            deploy-server-production = pkgs.writeShellScriptBin "deploy-server-production" ''
              set -euo pipefail
              : "''${APP_VERSION:?APP_VERSION must be set}"
              ${pkgs.flyctl}/bin/flyctl deploy --config ${crates/server/production/fly.toml} --image "ghcr.io/mythal/boluo/server:v''${APP_VERSION}" --env "APP_VERSION=''${APP_VERSION}" --remote-only
            '';

            deploy-site-staging = pkgs.writeShellScriptBin "deploy-site-staging" ''
              set -euo pipefail
              : "''${APP_VERSION:?APP_VERSION must be set}"
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/site/fly.toml} --image "ghcr.io/mythal/boluo/site:v''${APP_VERSION}" --env "APP_VERSION=''${APP_VERSION}" --remote-only
            '';

          };

          checks = {
            server = serverCheck;
            bridge = bridgeCheck;
            legacy = self'.packages.legacy;
            site = self'.packages.site;
            spa = self'.packages.spa;
          };
          devShells.default = pkgs.mkShell {
            buildInputs =
              with pkgs;
              [
                rustToolchain
                nil
                nixd
                nodejs
                clang
                pgformatter
                gnumake
                nixfmt
                sqlx-cli
                ast-grep
                flyctl
                cargo-nextest
                postgresql
                pulumiToolchain
                python3
                gh
              ]
              ++ lib.optionals stdenv.hostPlatform.isLinux [ pkgs.wild ];
            shellHook = ''
              export PATH="node_modules/.bin:$PATH"
            '';
          };
          devShells.format = pkgs.mkShell {
            packages = [ rustfmtToolchain ];
          };
          devShells.deployment = pkgs.mkShell {
            packages = with pkgs; [
              flyctl
              python3
            ];
          };
          devShells.infra = pkgs.mkShell {
            packages = [ pulumiToolchain ];
          };
        };
    };
}
