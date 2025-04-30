{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  inherit (pkgs) lib stdenv;
  src = pruneSource "legacy";
in
pkgs.buildNpmPackage {
  pname = "boluo-legacy";

  inherit src version;

  npmDeps = mkNpmDeps src;
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;

  installPhase = ''
    mkdir $out
    cp -r apps/legacy/dist/* $out
  '';
}
