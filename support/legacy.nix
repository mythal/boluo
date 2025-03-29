{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  src = pruneSource "legacy";
  npmDeps = mkNpmDeps src;
in
pkgs.buildNpmPackage {
  pname = "boluo-legacy";

  inherit src version npmDeps;

  installPhase = ''
    mkdir $out
    cp -r apps/legacy/dist/* $out
  '';

}
