{
  pkgs,
  version,
  pruneSource,
  ...
}:
let
  src = pruneSource "spa";
in
pkgs.buildNpmPackage {
  pname = "boluo-spa";
  inherit src version;

  npmDeps = pkgs.fetchNpmDeps {
    name = "boluo-spa-deps";
    hash = builtins.readFile ./hash-spa.txt;
    src = "${src}/package-lock.json";
    unpackPhase = ''
      cp $src package-lock.json
    '';
  };

  installPhase = ''
    mkdir -p $out/bin
    cp -r apps/spa/out/* $out
  '';
}
