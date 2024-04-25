import type { ParseResult } from './parse-result';
import { parse } from './parser';

// TODO: Re-implement async parsing
// eslint-disable-next-line @typescript-eslint/require-await
export const asyncParse = async (input: string, signal?: AbortSignal): Promise<ParseResult> => {
  return parse(input);
};
