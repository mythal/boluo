import { recordError } from '../error';
import { type Env, parse, type ParseResult } from '@boluo/interpreter';

export interface ParserArguments {
  source: string;
  defaultDiceFace: number;
}

export type ParserWorkerResponse =
  | { type: 'result'; data: ParseResult }
  | { type: 'error'; message: string };

const worker = self as unknown as Worker;
worker.addEventListener(
  'message',
  ({ data: { source, defaultDiceFace } }: MessageEvent<ParserArguments>) => {
    try {
      let env: Env | undefined;
      if (defaultDiceFace) {
        env = { defaultDiceFace, resolveUsername: () => 'unknown' };
      }
      worker.postMessage({ type: 'result', data: parse(source, true, env) });
    } catch (e) {
      recordError('Error in parsing: ', { source, error: e });
      const message = e instanceof Error ? e.message : String(e);
      worker.postMessage({ type: 'error', message });
    }
  },
);
