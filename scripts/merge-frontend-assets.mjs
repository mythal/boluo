import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MANIFEST_VERSION = 2;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
const MINIMUM_RELEASES = 2;

const parseArguments = () => {
  const values = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    const name = process.argv[index];
    const value = process.argv[index + 1];
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${name ?? '<end>'}`);
    }
    values.set(name.slice(2), value);
  }

  const archive = values.get('archive');
  const assets = values.get('assets');
  const version = values.get('version');
  if (!archive || !assets || !version) {
    throw new Error(
      'Usage: --archive <cache-directory> --assets <build-assets-directory> --version <release-id>',
    );
  }
  return { archive: path.resolve(archive), assets: path.resolve(assets), version };
};

const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
};

const relativeAssetPath = (root, filename) =>
  path.relative(root, filename).split(path.sep).join('/');

const resolveAssetPath = (root, relativePath) => {
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.split('/').some((part) => part === '..')
  ) {
    throw new Error(`Unsafe asset path in cache manifest: ${relativePath}`);
  }
  return path.join(root, ...relativePath.split('/'));
};

const fileExists = async (filename) => {
  try {
    return (await stat(filename)).isFile();
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
};

const readManifest = async (filename) => {
  try {
    const value = JSON.parse(await readFile(filename, 'utf8'));
    if (value?.version === MANIFEST_VERSION && Array.isArray(value.releases)) {
      return value.releases;
    }
    throw new Error(`Unsupported frontend asset cache manifest: ${filename}`);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
};

const copyAsset = async (source, destination) => {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
};

const main = async () => {
  const { archive, assets, version } = parseArguments();
  const filesRoot = path.join(archive, 'files');
  const manifestPath = path.join(archive, 'manifest.json');
  const now = Date.now();
  const cutoff = now - RETENTION_MS;

  await mkdir(filesRoot, { recursive: true });
  const previousReleases = await readManifest(manifestPath);
  for (const release of previousReleases) {
    if (
      typeof release?.id !== 'string' ||
      typeof release?.deployedAt !== 'number' ||
      !Array.isArray(release?.assets)
    ) {
      throw new Error(`Invalid frontend asset cache release in ${manifestPath}`);
    }
    for (const assetPath of release.assets) {
      if (typeof assetPath !== 'string') {
        throw new Error(`Invalid frontend asset cache path in ${manifestPath}`);
      }
      resolveAssetPath(filesRoot, assetPath);
    }
  }

  const currentFiles = await listFiles(assets);
  const currentPaths = [];
  for (const filename of currentFiles) {
    const relativePath = relativeAssetPath(assets, filename);
    currentPaths.push(relativePath);
    await copyAsset(filename, resolveAssetPath(filesRoot, relativePath));
  }

  const releases = [
    ...previousReleases.filter((release) => release.id !== version),
    { id: version, deployedAt: now, assets: currentPaths },
  ].sort((left, right) => right.deployedAt - left.deployedAt);
  const minimumReleaseIds = new Set(
    releases.slice(0, MINIMUM_RELEASES).map((release) => release.id),
  );
  const retainedReleases = releases.filter(
    (release) => release.deployedAt >= cutoff || minimumReleaseIds.has(release.id),
  );
  const retainedPaths = new Set(retainedReleases.flatMap((release) => release.assets));
  const currentPathSet = new Set(currentPaths);

  for (const filename of await listFiles(filesRoot)) {
    const relativePath = relativeAssetPath(filesRoot, filename);
    if (!retainedPaths.has(relativePath)) {
      await rm(filename, { force: true });
    }
  }

  let restored = 0;
  for (const relativePath of retainedPaths) {
    if (currentPathSet.has(relativePath)) continue;
    const archivedFile = resolveAssetPath(filesRoot, relativePath);
    if (!(await fileExists(archivedFile))) continue;
    const destination = resolveAssetPath(assets, relativePath);
    if (await fileExists(destination)) continue;
    await copyAsset(archivedFile, destination);
    restored += 1;
  }

  const manifest = {
    version: MANIFEST_VERSION,
    releases: retainedReleases,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `Prepared ${currentPaths.length} current and ${restored} historical frontend assets from ${retainedReleases.length} releases\n`,
  );
};

await main();
