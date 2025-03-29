{
  pkgs,
  version,
  pruneSource,
  ...
}:
let
  src = pruneSource "legacy";
in
pkgs.buildNpmPackage {
  pname = "boluo-legacy";

  inherit src version;

  npmDeps = pkgs.fetchNpmDeps {
    name = "boluo-legacy-deps";
    hash = builtins.readFile ./hash-legacy.txt;
    src = "${src}/package-lock.json";
    unpackPhase = ''
      cp $src package-lock.json
    '';
  };

  installPhase = ''
    mkdir $out
    cp -r apps/legacy/dist/* $out
  '';

}
