{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  src = pruneSource "site";
  npmDeps = mkNpmDeps src;
in
pkgs.buildNpmPackage {
  inherit version src npmDeps;
  pname = "boluo-site";

  STANDALONE = "true";
  TURBO_TELEMETRY_DISABLED = 1;
  NEXT_TELEMETRY_DISABLED = 1;

  installPhase = ''
    mkdir -p $out/bin
    cp -r apps/site/.next/standalone/* $out
    cp -r apps/site/.next/static $out/apps/site/.next/static
  '';
}
