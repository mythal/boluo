#!/usr/bin/env node

import { parse } from '@boluo/interpreter';

const readFromStdin = async (): Promise<string> => {
  if (process.stdin.isTTY) {
    return '';
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);

const main = async () => {
  const args = process.argv.slice(2);
  let source = args.join(' ').trim();
  if (!source) {
    source = (await readFromStdin()).trim();
  }
  if (!source) {
    console.error('Please provide the text to parse, either as arguments or via stdin.');
    process.exitCode = 1;
    return;
  }
  const { entities } = parse(source, true);
  process.stdout.write(formatJson({ entities, text: source }));
  if (!process.stdout.isTTY) {
    process.stdout.write('\n');
  }
};

main().catch((error) => {
  console.error('Failed to parse the source: ', error);
  process.exitCode = 1;
});
