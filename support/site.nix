{
  pkgs,
  version,
  pruneSource,
  mkNpmDeps,
  ...
}:
let
  src = pruneSource "site";
  site = pkgs.buildNpmPackage {
    inherit version src;
    pname = "boluo-site";

    npmDeps = mkNpmDeps src;
    npmConfigHook = pkgs.importNpmLock.npmConfigHook;

    TURBO_TELEMETRY_DISABLED = 1;
    NEXT_TELEMETRY_DISABLED = 1;

    installPhase = ''
      mkdir -p $out/bin
      cp -r apps/site/.next/standalone/* $out
      cp -r apps/site/.next/static $out/apps/site/.next/static
    '';
  };
in

pkgs.writeScriptBin "boluo-site" ''
  #!${pkgs.bash}/bin/bash
  ${pkgs.nodejs}/bin/node ${site}/apps/site/server.js
''
