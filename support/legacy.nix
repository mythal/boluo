{
  nodeDeps,
  pkgs,
  version,
  ...
}:
let
  inherit (pkgs) lib stdenv;
  pruned-legacy = stdenv.mkDerivation {
    name = "boluo-pruned-legacy-source";
    src = lib.cleanSource ../.;
    __contentAddressed = true;

    outputHashMode = "recursive";
    outputHashAlgo = "sha256";

    installPhase = ''
      ${pkgs.turbo}/bin/turbo prune legacy
      mkdir -p $out
      cp -r out/* $out
    '';
  };
in
pkgs.stdenv.mkDerivation {
  src = pruned-legacy;
  inherit version;
  pname = "boluo-legacy";
  doCheck = true;
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
    npm run build:legacy
    runHook postBuild
  '';
  checkPhase = ''
    runHook preCheck
    npm run check-types --filter=legacy
    runHook postCheck
  '';
  installPhase = ''
    mkdir $out
    cp -r apps/legacy/dist/* $out
  '';
}
