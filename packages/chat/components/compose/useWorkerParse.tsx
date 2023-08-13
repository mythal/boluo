import { useEffect } from 'react';
import type { ParseResult } from '../../interpreter/parser';
import { ComposeActionUnion } from '../../state/compose.actions';
import type { ParserArguments } from './parser-worker';

const create = (): Worker => new Worker(new URL('./parser-worker.ts', import.meta.url));

export const useWorkerParse = (dispatch: (action: ComposeActionUnion) => void, source: string) => {
  useEffect(() => {
    const worker = create();
    const onMessage = ({ data: parsed }: MessageEvent<ParseResult>) => {
      dispatch({ type: 'parsed', payload: parsed });
    };
    worker.addEventListener('message', onMessage);
    const args: ParserArguments = { source };
    worker.postMessage(args);
    return () => {
      worker.removeEventListener('message', onMessage);
      worker.terminate();
    };
  }, [source, dispatch]);
};
