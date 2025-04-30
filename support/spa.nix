{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  src = pruneSource "spa";
in
pkgs.buildNpmPackage {
  pname = "boluo-spa";
  inherit src version;

  npmDeps = mkNpmDeps src;
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;

  installPhase = ''
    mkdir -p $out/bin
    cp -r apps/spa/out/* $out
  '';
}
