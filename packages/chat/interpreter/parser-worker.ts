import { parse } from './parser';

export interface ParserArguments {
  source: string;
}

const worker = self as unknown as Worker;
worker.addEventListener('message', ({ data: { source } }: MessageEvent<ParserArguments>) => {
  worker.postMessage(
    parse(source),
  );
});
