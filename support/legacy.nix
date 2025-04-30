{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  src = pruneSource "legacy";
in
pkgs.buildNpmPackage {
  pname = "boluo-legacy";

  inherit src version;

  npmDeps = mkNpmDeps src;

  installPhase = ''
    mkdir $out
    cp -r apps/legacy/dist/* $out
  '';

}
