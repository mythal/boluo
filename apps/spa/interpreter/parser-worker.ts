import { recordError } from '../error';
import { parse, type ParseResult, type Variables } from '@boluo/interpreter';

export interface ParserArguments {
  source: string;
  defaultDiceFace: number;
  variables?: Variables;
}

export type ParserWorkerResponse =
  { type: 'result'; data: ParseResult } | { type: 'error'; message: string };

const worker = self as unknown as Worker;
worker.addEventListener(
  'message',
  ({ data: { source, defaultDiceFace, variables } }: MessageEvent<ParserArguments>) => {
    try {
      worker.postMessage({
        type: 'result',
        data: parse(source, {
          defaultDiceFace: defaultDiceFace || 20,
          variables,
        }),
      });
    } catch (e) {
      recordError('Error in parsing: ', { source, error: e });
      const message = e instanceof Error ? e.message : String(e);
      worker.postMessage({ type: 'error', message });
    }
  },
);
