{
  pkgs,
  version,
  pruneSource,
  ...
}:
let
  src = pruneSource "site";
in
pkgs.buildNpmPackage {
  inherit version src;
  pname = "boluo-site";

  npmDeps = pkgs.fetchNpmDeps {
    name = "boluo-site-deps";
    hash = builtins.readFile ./hash-site.txt;
    src = "${src}/package-lock.json";
    unpackPhase = ''
      cp $src package-lock.json
    '';
  };

  STANDALONE = "true";
  TURBO_TELEMETRY_DISABLED = 1;
  NEXT_TELEMETRY_DISABLED = 1;

  installPhase = ''
    mkdir -p $out/bin
    cp -r apps/site/.next/standalone/* $out
    cp -r apps/site/.next/static $out/apps/site/.next/static
  '';
}
