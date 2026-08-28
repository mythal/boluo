import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CACHE_CONTROL = 'public, max-age=15552000, immutable';
const DEFAULT_CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;

const CONTENT_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ts', 'text/plain; charset=utf-8'],
  ['.ttf', 'font/ttf'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

export const contentTypeFor = (filename) =>
  CONTENT_TYPES.get(path.extname(filename).toLowerCase()) ?? 'application/octet-stream';

export const objectKeyFor = (prefix, assetRoot, filename) => {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');
  if (!normalizedPrefix || normalizedPrefix.split('/').some((part) => part === '..')) {
    throw new Error(`Unsafe R2 object prefix: ${prefix}`);
  }
  const relativePath = path.relative(assetRoot, filename).split(path.sep).join('/');
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.split('/').some((part) => part === '..')
  ) {
    throw new Error(`Asset is outside its root: ${filename}`);
  }
  return `${normalizedPrefix}/${relativePath}`;
};

export const listFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(filename) : [filename];
    }),
  );
  return files.flat().sort();
};

const parseArguments = (argv) => {
  const values = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${name ?? '<end>'}`);
    }
    values.set(name.slice(2), value);
  }

  const assets = values.get('assets');
  const bucket = values.get('bucket');
  const prefix = values.get('prefix');
  const concurrency = Number(values.get('concurrency') ?? DEFAULT_CONCURRENCY);
  if (!assets || !bucket || !prefix || !Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error(
      'Usage: --assets <directory> --bucket <R2-bucket> --prefix <object-prefix> [--concurrency <count>]',
    );
  }
  return { assets: path.resolve(assets), bucket, concurrency, prefix };
};

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const upload = async ({ assets, bucket, filename, prefix }) => {
  const key = objectKeyFor(prefix, assets, filename);
  const args = [
    '--no-install',
    'wrangler',
    'r2',
    'object',
    'put',
    `${bucket}/${key}`,
    '--remote',
    '--file',
    filename,
    '--content-type',
    contentTypeFor(filename),
    '--cache-control',
    CACHE_CONTROL,
  ];

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await run('npx', args);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await wait(attempt * 500);
    }
  }
  throw new Error(`Failed to upload ${key}: ${lastError?.message ?? 'unknown error'}`);
};

const main = async () => {
  const options = parseArguments(process.argv);
  const files = await listFiles(options.assets);
  if (files.length === 0) throw new Error(`No frontend assets found in ${options.assets}`);

  let nextIndex = 0;
  let uploaded = 0;
  const workers = Array.from({ length: Math.min(options.concurrency, files.length) }, async () => {
    while (nextIndex < files.length) {
      const filename = files[nextIndex];
      nextIndex += 1;
      if (!filename) return;
      await upload({ ...options, filename });
      uploaded += 1;
      if (uploaded % 25 === 0 || uploaded === files.length) {
        process.stdout.write(`Uploaded ${uploaded}/${files.length} frontend history files\n`);
      }
    }
  });
  await Promise.all(workers);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
