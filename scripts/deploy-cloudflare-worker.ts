#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

type WorkerDeployment = {
  versions?: Array<{
    percentage?: unknown;
    version_id?: unknown;
  }>;
};

type WorkerVersion = {
  annotations?: Record<string, unknown>;
};

const separator = process.argv.indexOf('--');
if (separator === -1) {
  throw new Error(
    'Usage: deploy-cloudflare-worker.ts --tag-file <path> [--env <environment>] --message <message> -- <deploy command>',
  );
}

const options = process.argv.slice(2, separator);
const deployCommand = process.argv.slice(separator + 1);
let tagFile: string | undefined;
let environment: string | undefined;
let message: string | undefined;

for (let index = 0; index < options.length; index += 2) {
  const option = options[index];
  const value = options[index + 1];
  if (value === undefined) {
    throw new Error(`Missing value for ${option}`);
  }

  switch (option) {
    case '--tag-file':
      tagFile = value;
      break;
    case '--env':
      environment = value;
      break;
    case '--message':
      message = value;
      break;
    default:
      throw new Error(`Unknown option: ${option}`);
  }
}

const deployExecutable = deployCommand[0];
if (!tagFile || !message || !deployExecutable) {
  throw new Error('A tag file, message, and deploy command are required');
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const tag = readFileSync(tagFile, 'utf8').trim();
if (!tag) {
  throw new Error(`Tag file is empty: ${tagFile}`);
}

function runWrangler<T>(...wranglerArgs: string[]): T {
  const result = spawnSync('npx', ['--no-install', 'wrangler', ...wranglerArgs], {
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`wrangler exited with status ${result.status}`);
  }

  return JSON.parse(result.stdout) as T;
}

function currentTag(): string | undefined {
  const environmentArgs = environment ? ['--env', environment] : [];
  const deployment = runWrangler<WorkerDeployment>(
    'deployments',
    'status',
    '--json',
    ...environmentArgs,
  );
  const versions = deployment.versions;

  if (!Array.isArray(versions) || versions.length !== 1 || versions[0]?.percentage !== 100) {
    return undefined;
  }

  const versionId = versions[0].version_id;
  if (typeof versionId !== 'string') {
    return undefined;
  }

  const version = runWrangler<WorkerVersion>(
    'versions',
    'view',
    versionId,
    '--json',
    ...environmentArgs,
  );
  const deployedTag = version.annotations?.['workers/tag'];
  return typeof deployedTag === 'string' ? deployedTag : undefined;
}

try {
  const deployedTag = currentTag();
  if (deployedTag === tag) {
    console.log(`Worker is already deployed with tag ${tag}`);
    process.exit(0);
  }
  console.log(`Deploying Worker with tag ${tag} (current tag: ${deployedTag ?? 'none'})`);
} catch (error) {
  console.warn(`Could not determine the current Worker tag; deploying: ${error}`);
}

const isOpenNext = deployCommand.includes('@opennextjs/cloudflare');
const deployMessage = isOpenNext ? shellQuote(message) : message;
const result = spawnSync(
  deployExecutable,
  [...deployCommand.slice(1), '--tag', tag, '--message', deployMessage],
  {
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
