{
  pkgs,
  root,
  extraSourceFiles ? (_: [ ]),
}:
let
  inherit (pkgs) lib;

  workspaceManifest = builtins.fromTOML (builtins.readFile (root + "/Cargo.toml"));
  workspaceDependencies = workspaceManifest.workspace.dependencies or { };

  crateDirectories = lib.filter (
    name:
    (builtins.readDir (root + "/crates")).${name} == "directory"
    && builtins.pathExists (root + "/crates/${name}/Cargo.toml")
  ) (builtins.attrNames (builtins.readDir (root + "/crates")));

  crates = builtins.listToAttrs (
    map (
      directory:
      let
        manifest = builtins.fromTOML (builtins.readFile (root + "/crates/${directory}/Cargo.toml"));
      in
      lib.nameValuePair manifest.package.name {
        inherit directory manifest;
      }
    ) crateDirectories
  );

  dependencySections = [
    "dependencies"
    "dev-dependencies"
    "build-dependencies"
  ];

  dependenciesFor =
    manifest:
    let
      entriesFrom =
        section: dependencySection:
        lib.mapAttrsToList (name: value: { inherit name value; }) (dependencySection.${section} or { });
      targetEntries = lib.concatMap (
        target: lib.concatMap (section: entriesFrom section target) dependencySections
      ) (builtins.attrValues (manifest.target or { }));
    in
    lib.concatMap (section: entriesFrom section manifest) dependencySections ++ targetEntries;

  resolvedDependency =
    dependency:
    if builtins.isAttrs dependency.value && (dependency.value.workspace or false) then
      workspaceDependencies.${dependency.name} or { }
    else
      dependency.value;

  localDependenciesFor =
    crate:
    lib.filter (crate': crate' != null) (
      map (
        dependency:
        let
          resolved = resolvedDependency dependency;
          packageName = resolved.package or dependency.name;
        in
        if builtins.isAttrs resolved && resolved ? path then
          crates.${packageName} or (throw "Unknown local Cargo dependency: ${packageName}")
        else
          null
      ) (dependenciesFor crate.manifest)
    );

  closureFor =
    target:
    builtins.genericClosure {
      startSet = [
        {
          key = target;
          value = crates.${target} or (throw "Unknown Cargo workspace crate: ${target}");
        }
      ];
      operator =
        item:
        map (crate: {
          key = crate.manifest.package.name;
          value = crate;
        }) (localDependenciesFor item.value);
    };

  targetFilesFor =
    crate:
    let
      inherit (crate) directory manifest;
      explicitTargets =
        lib.optional (manifest ? lib) (manifest.lib.path or "src/lib.rs")
        ++ map (bin: bin.path or "src/main.rs") (manifest.bin or [ ]);
      candidatePaths = [
        "build.rs"
        "src/lib.rs"
        "src/main.rs"
      ]
      ++ explicitTargets;
    in
    map (path: root + "/crates/${directory}/${path}") (
      lib.filter (path: builtins.pathExists (root + "/crates/${directory}/${path}")) candidatePaths
    );

  sourceFor =
    target:
    lib.fileset.toSource {
      inherit root;
      fileset = lib.fileset.unions (
        [
          (root + "/Cargo.toml")
          (root + "/Cargo.lock")
        ]
        # Cargo resolves the whole workspace when --locked is used. Keep every
        # member manifest so its view of the workspace still matches Cargo.lock,
        # while only retaining source trees in the target's local dependency
        # closure below.
        ++ map (directory: root + "/crates/${directory}/Cargo.toml") crateDirectories
        # Cargo also requires every workspace package to expose at least one
        # target when it reads its manifest. Retain only those entry-point files
        # for packages outside the selected source closure.
        ++ lib.concatMap targetFilesFor (builtins.attrValues crates)
        ++ map (item: root + "/crates/${item.value.directory}") (closureFor target)
        ++ extraSourceFiles target
      );
    };
in
{
  inherit sourceFor;
}
