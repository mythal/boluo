# Nix Workspaces

Nix helpers that generate a target-specific source tree from a workspace package's local dependency closure.

## npm

`npm.nix` also creates the matching npm dependency set. It supports npm lockfile v3; other package managers are out of scope.

```nix
npmWorkspaceLib = import ./packages/nix-workspaces/npm.nix {
  inherit pkgs;
  root = unfilteredRoot;
  # Root dependencies required to build the target. All are retained by default.
  rootDependencyNames = [ "turbo" ];
  # Paths or filesets to include in every target source tree.
  extraSourceFiles = [ (unfilteredRoot + "/turbo.json") ];
};

frontendBuildArgs = workspacePackageName: {
  pname = "foobar-${workspacePackageName}";
  src = npmWorkspaceLib.sourceFor workspacePackageName;
  npmDeps = npmWorkspaceLib.mkNpmDepsFor workspacePackageName {
    pname = "foobar-${workspacePackageName}-npm-deps";
    inherit version;
  };
  inherit version;
  npmConfigHook = pkgs.importNpmLock.npmConfigHook;
  npmBuildScript = "build:${workspacePackageName}";
};
```

## Cargo

`cargo.nix` creates a source tree for one Cargo workspace package. Rust packages must live under `crates/*`, with the root workspace using the matching member glob.

```nix
cargoWorkspaceLib = import ./packages/nix-workspaces/cargo.nix {
  inherit pkgs;
  root = ./.;
  # For files Cargo does not declare, such as SQL migrations or test configuration.
  extraSourceFiles = target:
    pkgs.lib.optionals (target == "server") [
      ./apps/db/schema.sql
    ];
};

serverSrc = cargoWorkspaceLib.sourceFor "server";
```
