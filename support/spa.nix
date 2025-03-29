{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  src = pruneSource "spa";
  npmDeps = mkNpmDeps src;
in
pkgs.buildNpmPackage {
  pname = "boluo-spa";
  inherit src version npmDeps;

  installPhase = ''
    mkdir -p $out/bin
    cp -r apps/spa/out/* $out
  '';
}
