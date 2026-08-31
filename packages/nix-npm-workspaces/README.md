# Nix npm Workspaces

This library generates target-specific source trees and npm dependency sets for a monorepo based on each target workspace's dependency closure.

Only npm lockfile v3 is supported. Supporting other package managers, such as pnpm, is not planned.

## Usage

```nix
npmWorkspaceLib = import ./packages/nix-npm-workspaces {
  inherit pkgs;
  root = unfilteredRoot;
  # Non-workspace dependencies from the root package.json that are required
  # to build the target. All root dependencies are retained if omitted or null.
  rootDependencyNames = [ "turbo" ];
  # Additional paths or filesets to include in every target's source tree.
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

legacy = pkgs.buildNpmPackage (
  frontendBuildArgs "workspace-member-name"
);
```
