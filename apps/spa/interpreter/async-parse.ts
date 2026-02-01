import type { ParseResult } from '@boluo/interpreter';
import type { ParserArguments, ParserWorkerResponse } from './parser-worker';

const PARSE_ERROR_ALERT_INTERVAL_MS = 30000;
let lastParseErrorAlertAt = 0;

const alertParseError = (message: string) => {
  const now = Date.now();
  if (now - lastParseErrorAlertAt < PARSE_ERROR_ALERT_INTERVAL_MS) return;
  lastParseErrorAlertAt = now;
  alert(`Failed to parse input. ${message ? `(${message})` : 'Please try again.'}`);
};

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
    const handleMessage = ({ data }: MessageEvent<ParserWorkerResponse | ParseResult>) => {
      worker.removeEventListener('message', handleMessage);
      putBack(worker);
      if (aborted) return;
      if (data && typeof data === 'object' && 'type' in data) {
        const payload = data;
        if (payload.type === 'result') {
          resolve(payload.data);
          return;
        }
        if (payload.type === 'error') {
          alertParseError(payload.message);
          reject(new Error(payload.message));
          return;
        }
      }
      resolve(data as ParseResult);
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
