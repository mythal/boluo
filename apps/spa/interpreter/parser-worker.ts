import { recordError } from '../error';
import { type Env, parse } from '@boluo/interpreter';

export interface ParserArguments {
  source: string;
  defaultDiceFace: number;
}

const worker = self as unknown as Worker;
worker.addEventListener(
  'message',
  ({ data: { source, defaultDiceFace } }: MessageEvent<ParserArguments>) => {
    try {
      let env: Env | undefined;
      if (defaultDiceFace) {
        env = { defaultDiceFace, resolveUsername: () => 'unknown' };
      }
      worker.postMessage(parse(source, true, env));
    } catch (e) {
      recordError('Error in parsing: ', { source, error: e });
    }
  },
);
