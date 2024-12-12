{
  description = "A chat tool made for play RPG";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-24.11";
    flake-parts.url = "github:hercules-ci/flake-parts";
    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    crane = {
      url = "github:ipetkov/crane";
    };
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    napalm = {
      url = "github:nix-community/napalm";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs @ { flake-parts, crane, napalm, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.devshell.flakeModule
      ];

      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      perSystem = { config, self', inputs', pkgs, system, ... }:
        let
          inherit (pkgs) lib stdenv;
          version = "0.0.0";
          targets = [ "wasm32-unknown-unknown" "x86_64-unknown-linux-gnu" ];

          rustToolchain = pkgs.rust-bin.selectLatestNightlyWith (toolchain: toolchain.default.override {
            extensions = [ "rust-src" "rust-analyzer" ];
          });

          craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;

          darwinInputs = with pkgs; lib.optionals stdenv.isDarwin [
            libiconv
            darwin.libobjc
            darwin.apple_sdk.frameworks.Security
            darwin.apple_sdk.frameworks.SystemConfiguration
            darwin.apple_sdk.frameworks.CoreFoundation
            darwin.apple_sdk.frameworks.IOKit
          ];

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

          src =
            let
              filters = [
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
            pname = "boluo-deps";

            inherit src version;
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

          packages =
            let
              napalmBuildPackage = napalm.legacyPackages."${system}".buildPackage;
              nodeDeps = napalmBuildPackage
                # Keeps only package.json and package-lock.json files
                (pkgs.lib.sourceByRegex ./. [
                  ".*package.json"
                  ".*package-lock.json"
                  "(apps|packages)"
                  "(apps|packages)/[a-zA-Z0-9_-]+"
                ])
                {
                  pname = "boluo-node-deps";
                  buildInputs = with pkgs; [ cacert ];
                  npmCommands = [ "npm ci --loglevel verbose --nodedir=${pkgs.nodejs}/include/node" ];
                }
              ;
            in
            {
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



              site =
                let
                  filters = [
                    (path: _type: lib.hasSuffix "nx.json" path)
                    (path: _type: lib.hasSuffix "package.json" path)
                    (path: _type: lib.hasSuffix "package-lock.json" path)
                    (path: _type: lib.hasSuffix "/apps" path)
                    (path: _type: lib.hasInfix "/apps/site" path)
                    (path: _type: lib.hasInfix "/packages" path)
                    (path: _type: lib.hasSuffix "/apps/server" path)
                    (path: _type: lib.hasInfix "/apps/server/bindings" path)
                  ];
                  src = pkgs.lib.cleanSourceWith {
                    src = ./.;
                    filter =
                      path: type: builtins.any (f: f path type) filters;
                  };
                  site-package = pkgs.stdenv.mkDerivation {
                    inherit src version;
                    pname = "boluo-site";
                    buildInputs = [
                      pkgs.nodejs
                      pkgs.cacert
                    ];

                    PUBLIC_MEDIA_URL = "https://media.boluo.chat";
                    BACKEND_URL = "https://boluo.chat";

                    configurePhase = ''
                      runHook preConfigure
                      export HOME=$(mktemp -d)
                      runHook postConfigure
                    '';
                    buildPhase = ''
                      runHook preBuild
                      cp -r ${nodeDeps}/_napalm-install/node_modules .
                      chmod -R u+w .

                      # Workaround for nx issue
                      # https://github.com/nrwl/nx/issues/22445#issuecomment-2057097871
                      ${pkgs.util-linux}/bin/script -c "npm run build:site" /dev/null

                      runHook postBuild
                    '';
                    installPhase = ''
                      mkdir -p $out/bin
                      cp -r apps/site/.next/standalone/* $out
                      cp -r apps/site/.next/static $out/apps/site/.next/static
                    '';
                  };
                in
                pkgs.writeScriptBin "boluo-site" ''
                  #!${pkgs.bash}/bin/bash
                  ${pkgs.nodejs}/bin/node ${site-package}/apps/site/server.js
                '';
              site-image = pkgs.dockerTools.buildLayeredImage {
                name = "boluo-site";
                tag = "latest";
                contents = with pkgs; commonImageContents ++ [
                  curl
                ];
                config = {
                  Env = certEnv;
                  Cmd = [ "${self'.packages.site}/bin/boluo-site" ];
                };
              };
              legacy =
                let
                  filters = [
                    (path: _type: lib.hasSuffix "nx.json" path)
                    (path: _type: lib.hasSuffix "package.json" path)
                    (path: _type: lib.hasSuffix "package-lock.json" path)
                    (path: _type: lib.hasSuffix "/apps" path)
                    (path: _type: lib.hasInfix "/apps/legacy" path)
                  ];
                  src = pkgs.lib.cleanSourceWith {
                    src = ./.;
                    filter =
                      path: type: builtins.any (f: f path type) filters;
                  };
                in
                pkgs.stdenv.mkDerivation {
                  inherit src version;
                  pname = "boluo-legacy";
                  buildInputs = [
                    pkgs.nodejs
                    pkgs.cacert
                  ];

                  configurePhase = ''
                    runHook preConfigure
                    export HOME=$(mktemp -d)
                    runHook postConfigure
                  '';
                  buildPhase = ''
                    runHook preBuild
                    cp -r ${nodeDeps}/_napalm-install/node_modules .
                    chmod -R u+w .
                    # Workaround for nx issue
                    # https://github.com/nrwl/nx/issues/22445#issuecomment-2057097871
                    ${pkgs.util-linux}/bin/script -c "npm run build:legacy" /dev/null
                    runHook postBuild
                  '';
                  installPhase = ''
                    mkdir $out
                    cp -r apps/legacy/dist/* $out
                  '';
                };
              legacy-image =
                # https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/docker/examples.nix
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
                    Cmd = [ "nginx" "-c" nginxConf ];
                    ExposedPorts = {
                      "${nginxPort}/tcp" = { };
                    };
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
                  rustToolchain
                  nil
                  nodejs
                  clang
                  pgformatter
                  gnumake
                  nixpkgs-fmt
                  sqlx-cli
                ];
              in
              common ++ darwinInputs;
            packagesFrom = [ self'.packages.server ];
            # https://github.com/cachix/devenv/issues/267
            env = [
              {
                name = "PATH";
                prefix = "node_modules/.bin";
              }
              { name = "PKG_CONFIG_PATH"; eval = "$DEVSHELL_DIR/lib/pkgconfig"; }
              {
                name = "LIBRARY_PATH";
                eval = "$DEVSHELL_DIR/lib";
              }
              {
                name = "CFLAGS";
                eval = ''"-I $DEVSHELL_DIR/include ${lib.optionalString pkgs.stdenv.isDarwin "-iframework $DEVSHELL_DIR/Library/Frameworks"}"'';
              }
            ] ++ lib.optionals pkgs.stdenv.isDarwin [
              {
                name = "RUSTFLAGS";
                eval = ''"-L framework=$DEVSHELL_DIR/Library/Frameworks"'';
              }
              {
                name = "RUSTDOCFLAGS";
                eval = ''"-L framework=$DEVSHELL_DIR/Library/Frameworks"'';
              }
            ];
          };
        };
    };
}
