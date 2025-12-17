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
          npmApps = [
            "legacy"
            "spa"
            "site"
          ];
          unfilteredRoot = ./.;
          rev = if (self ? rev) then self.rev else lib.warn "Dirty workspace" "unknown";
          pruneSource =
            name:
            pkgs.stdenvNoCC.mkDerivation {
              name = "boluo-${name}-source";
              src = lib.cleanSource unfilteredRoot;
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
              extensions = [ "rust-src" ];
            }
          );

          craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

          versionEnv = "APP_VERSION=${rev}";

          imageLabel = {
            "org.opencontainers.image.url" = "https://github.com/mythal/boluo";
            "org.opencontainers.image.version" = version;
            "org.opencontainers.image.revision" = rev;
            "org.opencontainers.image.vendor" = "Mythal";
            "org.opencontainers.image.licenses" = "AGPL-3.0";
          };

          # https://crane.dev/source-filtering.html#fileset-filtering
          # https://nixos.org/manual/nixpkgs/unstable/#sec-functions-library-fileset
          cargoSource =
            let
              inherit (lib.fileset)
                unions
                difference
                fileFilter
                maybeMissing
                ;
              ignoreFilenames = [
                "wrangler.toml"
                ".rustfmt.toml"
                ".taplo.toml"
                "fly.toml"
                "fly.staging.toml"
                "schema.sql"
              ];
              filesetToIgnore = unions (
                map (name: fileFilter (file: file.name == name) unfilteredRoot) ignoreFilenames
              );
              fileset = difference (unions [
                (craneLib.fileset.commonCargoSources unfilteredRoot)
                (fileFilter (file: file.hasExt "sql") unfilteredRoot)
                (maybeMissing ./.sqlx)
                (maybeMissing ./apps/server/text)
              ]) filesetToIgnore;
            in
            lib.fileset.toSource {
              root = unfilteredRoot;
              inherit fileset;
              # Debugging:
              # fileset = lib.fileset.trace fileset fileset;
            };

          commonArgs = {
            src = cargoSource;
            inherit version;
            strictDeps = true;

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

                inherit cargoArtifacts;
                cargoExtraArgs = "--package=server";
                cargoTestExtraArgs = "-- --skip db_test_";
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
                  "APP_VERSION=${rev}"
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
                Env = [ versionEnv ];
                Cmd = [ "/bin/server" ];
                Labels = imageLabel;
              };
            };

            legacy =
              let
                src = pruneSource "legacy";
              in
              pkgs.buildNpmPackage {
                pname = "boluo-legacy";

                inherit src version;

                npmDeps = common.mkNpmDeps src;
                npmConfigHook = pkgs.importNpmLock.npmConfigHook;

                installPhase = ''
                  mkdir $out
                  cp -r apps/legacy/dist/* $out
                '';
              };

            legacy-image =
              let
                webRoot = self'.packages.legacy;
                nginxPort = "80";
                nginxConf = pkgs.writeText "nginx.conf" ''
                  user nobody nobody;
                  daemon off;
                  error_log /dev/stdout info;
                  pid /dev/null;
                  events {}
                  http {
                    include ${pkgs.nginx}/conf/mime.types;
                    access_log /dev/stdout;
                    server {
                      server_name _;
                      listen ${nginxPort};
                      listen [::]:${nginxPort};
                      index index.html index.htm;
                      location / {
                        root ${webRoot};
                        try_files $uri $uri/ $uri.html /index.html;
                      }
                      location /api {
                        return 404;
                      }
                    }
                  }
                '';
              in
              pkgs.dockerTools.buildLayeredImage {
                name = "boluo-legacy";
                tag = "latest";

                contents = [
                  pkgs.fakeNss
                  pkgs.nginx
                ];
                extraCommands = ''
                  mkdir -p tmp/nginx_client_body

                  # nginx still tries to read this directory even if error_log
                  # directive is specifying another file :/
                  mkdir -p var/log/nginx
                '';
                config = {
                  Cmd = [
                    "nginx"
                    "-c"
                    nginxConf
                  ];
                  ExposedPorts = {
                    "${nginxPort}/tcp" = { };
                  };
                  Labels = imageLabel;
                };
              };

            site =
              let
                src = pruneSource "site";
              in
              pkgs.buildNpmPackage {
                inherit version src;
                pname = "boluo-site";

                npmDeps = common.mkNpmDeps src;
                npmConfigHook = pkgs.importNpmLock.npmConfigHook;

                TURBO_TELEMETRY_DISABLED = 1;
                NEXT_TELEMETRY_DISABLED = 1;

                installPhase = ''
                  mkdir -p $out/bin
                  cp -r apps/site/.next/standalone/* $out
                  cp -r apps/site/.next/static $out/apps/site/.next/static
                  echo '#!/bin/sh' > $out/bin/boluo-site
                  echo 'exec ${pkgs.nodejs}/bin/node' '"$(dirname $0)"'"/../apps/site/server.js" >> $out/bin/boluo-site
                  chmod +x $out/bin/boluo-site
                '';
              };

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
                  versionEnv
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

            spa =
              let
                src = pruneSource "spa";
              in
              pkgs.buildNpmPackage {
                pname = "boluo-spa";
                inherit src version;

                npmDeps = common.mkNpmDeps src;
                npmConfigHook = pkgs.importNpmLock.npmConfigHook;

                installPhase = ''
                  mkdir -p $out/bin
                  cp -r apps/spa/out/* $out
                '';
              };

            spa-image =
              let
                webRoot = self'.packages.spa;
                nginxPort = "80";
                nginxConf = pkgs.writeText "nginx.conf" ''
                  user nobody nobody;
                  daemon off;
                  error_log /dev/stdout info;
                  pid /dev/null;
                  events {}
                  http {
                    include ${pkgs.nginx}/conf/mime.types;
                    access_log /dev/stdout;
                    server {
                      server_name _;
                      listen ${nginxPort};
                      listen [::]:${nginxPort};
                      index index.html index.htm;
                      location / {
                        root ${webRoot};
                        try_files $uri $uri/ $uri.html /index.html;
                      }
                      location /api {
                        return 404;
                      }
                    }
                  }
                '';
              in
              pkgs.dockerTools.buildLayeredImage {
                name = "boluo-spa";
                tag = "latest";

                contents = [
                  pkgs.fakeNss
                  pkgs.nginx
                ];
                extraCommands = ''
                  mkdir -p tmp/nginx_client_body

                  # nginx still tries to read this directory even if error_log
                  # directive is specifying another file :/
                  mkdir -p var/log/nginx
                '';
                config = {
                  Cmd = [
                    "nginx"
                    "-c"
                    nginxConf
                  ];
                  ExposedPorts = {
                    "${nginxPort}/tcp" = { };
                  };
                  Labels = imageLabel;
                };
              };

            push-images =
              let
                tagPrefix = "ghcr.io/mythal/boluo";
                serverImage = "${tagPrefix}/server";
                legacyImage = "${tagPrefix}/legacy";
                siteImage = "${tagPrefix}/site";
                spaImage = "${tagPrefix}/spa";
              in
              pkgs.writeShellScriptBin "push-images" ''
                set -e
                ${pkgs.skopeo}/bin/skopeo login ghcr.io -u $GITHUB_ACTOR -p $GITHUB_TOKEN
                IMAGE_TAG="$(${pkgs.python3}/bin/python3 ${./scripts/image-tag.py})"
                echo "Pushing images with tag: $IMAGE_TAG"
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.server-image}" docker://${serverImage}:$IMAGE_TAG
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.server-image}" docker://${serverImage}:v${self.rev}
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.legacy-image}" docker://${legacyImage}:$IMAGE_TAG
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.legacy-image}" docker://${legacyImage}:v${self.rev}
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.site-image}" docker://${siteImage}:$IMAGE_TAG
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.site-image}" docker://${siteImage}:v${self.rev}
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.spa-image}" docker://${spaImage}:$IMAGE_TAG
                ${pkgs.skopeo}/bin/skopeo copy docker-archive:"${self'.packages.spa-image}" docker://${spaImage}:v${self.rev}
              '';

            deploy-server-staging = pkgs.writeShellScriptBin "deploy-server-staging" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/server/fly.toml} --image ghcr.io/mythal/boluo/server:v${self.rev} --remote-only
            '';

            deploy-server-production = pkgs.writeShellScriptBin "deploy-server-production" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/server/production/fly.toml} --image ghcr.io/mythal/boluo/server:v${self.rev} --remote-only
            '';

            deploy-site-staging = pkgs.writeShellScriptBin "deploy-site-staging" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/site/fly.toml} --image ghcr.io/mythal/boluo/site:v${self.rev} --remote-only
            '';

            deploy-site-production = pkgs.writeShellScriptBin "deploy-site-production" ''
              ${pkgs.flyctl}/bin/flyctl deploy --config ${apps/site/production/fly.toml} --image ghcr.io/mythal/boluo/site:v${self.rev} --remote-only
            '';
          };

          checks = {
            server = self'.packages.server;
            legacy = self'.packages.legacy;
            site = self'.packages.site;
            spa = self'.packages.spa;
          };
          devShells.default =
            let
              libPath =
                with pkgs;
                lib.makeLibraryPath (
                  lib.optionals pkgs.stdenv.isLinux [
                    wayland-protocols
                    wayland
                    libxkbcommon
                    libGL
                  ]
                );
            in
            pkgs.mkShell {
              buildInputs = with pkgs; [
                rustToolchain
                nil
                nodejs
                clang
                pgformatter
                gnumake
                nixfmt-rfc-style
                sqlx-cli
                ast-grep
                flyctl
                cargo-nextest
              ];
              shellHook = ''
                export PATH="node_modules/.bin:$PATH"
                export LD_LIBRARY_PATH=${libPath}
              '';
            };
        };
    };
}
