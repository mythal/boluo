{
  pkgs,
  version,
  nodeDeps,
  ...
}:
let
  inherit (pkgs) lib stdenv;
  pruned-site = pkgs.stdenv.mkDerivation {
    name = "boluo-pruned-site-source";
    src = pkgs.lib.cleanSource ../.;
    __contentAddressed = true;

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";

    TURBO_TELEMETRY_DISABLED = 1;
    installPhase = ''
      ${pkgs.turbo}/bin/turbo prune site
      mkdir -p $out
      cp -r out/* $out
    '';
  };
in
stdenv.mkDerivation {
  src = pkgs.lib.cleanSource ../.;
  inherit version;
  pname = "boluo-site";
  buildInputs = [
    pkgs.nodejs
    pkgs.cacert
  ];
  STANDALONE = "true";
  TURBO_TELEMETRY_DISABLED = 1;
  NEXT_TELEMETRY_DISABLED = 1;

  configurePhase = ''
    runHook preConfigure
    export HOME=$(mktemp -d)
    runHook postConfigure
  '';

  buildPhase = ''
    runHook preBuild
    cp -r ${nodeDeps}/_napalm-install/node_modules .
    chmod -R u+w .
    npm run build:site
    runHook postBuild
  '';
  installPhase = ''
    mkdir -p $out/bin
    cp -r apps/site/.next/standalone/* $out
    cp -r apps/site/.next/static $out/apps/site/.next/static
  '';
}
