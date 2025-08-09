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
                Cmd =
                  let
                    entrypoint = pkgs.writeShellScriptBin "entrypoint" ''
                      set -e
                      ulimit -n 262140
                      ${self'.packages.server}/bin/server
                    '';
                  in
                  [ "${entrypoint}/bin/entrypoint" ];
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
              copyToRoot =
                with pkgs;
                commonImageContents
                ++ [
                  curl
                  nodejs
                ];
              runAsRoot = ''
                cp -r ${self'.packages.site} /app
              '';
              config = {
                Env = commonEnv ++ [
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

            push-images = pkgs.writeShellScriptBin "push-images" ''
              set -e
              skopeo login ghcr.io -u $GITHUB_ACTOR -p $GITHUB_TOKEN
              IMAGE_TAG="$(${pkgs.python3}/bin/python3 ${./scripts/image-tag.py})"
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
