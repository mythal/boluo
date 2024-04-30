import { parse } from './parser';

export interface ParserArguments {
  source: string;
}

const worker = self as unknown as Worker;
worker.addEventListener('message', ({ data: { source } }: MessageEvent<ParserArguments>) => {
  try {
    worker.postMessage(parse(source));
  } catch (e) {
    console.error('Error in parsing: ', e);
  }
});
