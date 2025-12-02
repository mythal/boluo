import type { ParseResult } from '@boluo/interpreter';
import type { ParserArguments } from './parser-worker';

const create = (): Worker =>
  new Worker(new URL('./parser-worker.ts', import.meta.url), { type: 'module' });

const workerPool: Worker[] =
  typeof window === 'undefined' ? [] : [create(), create(), create(), create()];

const putBack = (worker: Worker): void => {
  if (workerPool.length < 4) {
    workerPool.push(worker);
  } else {
    worker.terminate();
  }
};

export const asyncParse = (
  parserArguments: ParserArguments,
  signal?: AbortSignal,
): Promise<ParseResult> => {
  const worker = workerPool.pop() ?? create();
  const promise = new Promise<ParseResult>((resolve, reject) => {
    if (signal?.aborted) {
      putBack(worker);
      reject(new Error('Aborted before parsing started'));
      return;
    }
    let aborted = false;
    const handleMessage = ({ data }: MessageEvent<ParseResult>) => {
      worker.removeEventListener('message', handleMessage);
      putBack(worker);
      if (aborted) return;
      resolve(data);
    };
    signal?.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('Aborted during parsing'));
    });
    worker.addEventListener('message', handleMessage);
  });
  worker.postMessage(parserArguments);
  return promise;
};
