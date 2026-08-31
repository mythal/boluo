{
  pkgs,
  root,
  rootDependencyNames ? null,
  extraSourceFiles ? [ ],
}:
let
  inherit (pkgs) lib;

  package = lib.importJSON (root + "/package.json");
  packageLock = lib.importJSON (root + "/package-lock.json");

  workspaces =
    let
      # Workspace names are represented by node_modules link entries;
      # their resolved values point back to the workspace directories.
      workspaceLinks = lib.filterAttrs (
        path: workspace:
        lib.hasPrefix "node_modules/" path && (workspace.link or false) && workspace ? resolved
      ) packageLock.packages;
    in
    lib.mapAttrs' (
      path: workspace:
      lib.nameValuePair (lib.removePrefix "node_modules/" path) {
        path = workspace.resolved;
        package = packageLock.packages.${workspace.resolved};
      }
    ) workspaceLinks;

  dependencyNames =
    workspace:
    builtins.attrNames (
      (workspace.dependencies or { })
      // (workspace.devDependencies or { })
      // (workspace.optionalDependencies or { })
      // (workspace.peerDependencies or { })
    );

  workspaceClosureFor =
    target:
    builtins.genericClosure {
      startSet = [
        {
          key = target;
          value = workspaces.${target} or (throw "Unknown npm workspace: ${target}");
        }
      ];
      operator =
        item:
        let
          workspace = item.value.package;
          workspaceDependencies = lib.filter (name: builtins.hasAttr name workspaces) (
            dependencyNames workspace
          );
        in
        map (name: {
          key = name;
          value = builtins.getAttr name workspaces;
        }) workspaceDependencies;
    };

  manifestFilesFor =
    target:
    let
      inherit (lib.fileset) maybeMissing;
    in
    # npm needs the selected workspace manifests to recreate workspace links,
    # but the dependency source does not need workspace code.
    [
      (maybeMissing (root + "/package.json"))
    ]
    ++ map (item: maybeMissing (root + "/${item.value.path}/package.json")) (
      workspaceClosureFor target
    );

  manifestSourceFor =
    target:
    lib.fileset.toSource {
      inherit root;
      fileset = lib.fileset.unions (manifestFilesFor target);
    };

  selectedRootDependencies =
    if rootDependencyNames == null then dependencyNames package else rootDependencyNames;

  filterDependencies =
    dependencyNames': package':
    package'
    // lib.optionalAttrs (package' ? dependencies) {
      dependencies = lib.filterAttrs (name: _: builtins.elem name dependencyNames') package'.dependencies;
    }
    // lib.optionalAttrs (package' ? devDependencies) {
      devDependencies = lib.filterAttrs (
        name: _: builtins.elem name dependencyNames'
      ) package'.devDependencies;
    }
    // lib.optionalAttrs (package' ? optionalDependencies) {
      optionalDependencies = lib.filterAttrs (
        name: _: builtins.elem name dependencyNames'
      ) package'.optionalDependencies;
    }
    // lib.optionalAttrs (package' ? peerDependencies) {
      peerDependencies = lib.filterAttrs (
        name: _: builtins.elem name dependencyNames'
      ) package'.peerDependencies;
    };

  packageFor =
    target:
    filterDependencies selectedRootDependencies (
      package
      // {
        workspaces = map (item: item.value.path) (workspaceClosureFor target);
      }
    );

  dependencyPathFor =
    packagePath: dependency:
    let
      components = lib.splitString "/" packagePath;
      ancestorLengths = lib.reverseList (lib.range 0 (builtins.length components));
      candidates = map (
        length:
        let
          prefix = lib.concatStringsSep "/" (lib.take length components);
        in
        lib.optionalString (prefix != "") "${prefix}/" + "node_modules/${dependency}"
      ) ancestorLengths;
      existing = lib.filter (path: builtins.hasAttr path packageLock.packages) candidates;
    in
    if existing == [ ] then null else builtins.head existing;

  packageLockFor =
    target:
    let
      rootPackage = packageFor target;
      rootLockPackage = filterDependencies selectedRootDependencies packageLock.packages."";
      workspaceItems = workspaceClosureFor target;
      startSet = [
        {
          key = "";
          value = rootLockPackage // {
            workspaces = rootPackage.workspaces;
          };
        }
      ]
      ++ map (item: {
        key = item.value.path;
        value = item.value.package;
      }) workspaceItems;
      packageClosure = builtins.genericClosure {
        inherit startSet;
        operator =
          item:
          if item.value.link or false then
            lib.optional (builtins.hasAttr item.value.resolved packageLock.packages) {
              key = item.value.resolved;
              value = packageLock.packages.${item.value.resolved};
            }
          else
            builtins.filter (dependency: dependency != null) (
              map (
                dependency:
                let
                  path = dependencyPathFor item.key dependency;
                in
                if path == null then
                  null
                else
                  {
                    key = path;
                    value = packageLock.packages.${path};
                  }
              ) (dependencyNames item.value)
            );
      };
    in
    packageLock
    // {
      packages = builtins.listToAttrs (map (item: lib.nameValuePair item.key item.value) packageClosure);
    };

  sourceFor =
    target:
    let
      workspaceSources = map (item: root + "/${item.value.path}") (workspaceClosureFor target);
    in
    lib.fileset.toSource {
      inherit root;
      fileset = lib.fileset.unions (extraSourceFiles ++ manifestFilesFor target ++ workspaceSources);
    };
in
{
  inherit sourceFor;

  mkNpmDepsFor =
    target:
    {
      pname,
      version ? package.version,
    }:
    pkgs.importNpmLock {
      npmRoot = manifestSourceFor target;
      package = packageFor target;
      packageLock = packageLockFor target;
      inherit
        pname
        version
        ;
    };
}
