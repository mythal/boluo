import { ParseResult, emptyParseResult } from './parse-result';
import { fromRawEntities } from './entities';

export const messageToParsed = (text: string, rawEntities: unknown): ParseResult => {
  if (!Array.isArray(rawEntities) || text === null) {
    return emptyParseResult;
  }
  const entities = fromRawEntities(text, rawEntities);
  return { ...emptyParseResult, text, entities };
};
