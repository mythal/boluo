import { type ParseResult, emptyParseResult } from './parse-result';
import { type Entities } from '@boluo/api';

export const messageToParsed = (text: string, entities: Entities): ParseResult => {
  if (!Array.isArray(entities) || text == null) {
    return emptyParseResult;
  }
  return { ...emptyParseResult, text, entities };
};
