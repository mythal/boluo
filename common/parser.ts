import { Entity } from './entities';

const TEXT = /^[\s\S][^*@\s]*\s*/;
const STRONG = /^\*\*(.+?)\*\*/;
const URL = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
const LINK = /^\[(.+)]\((.+)\)/;

interface ParseResult {
  text: string;
  entities: Entity[];
}

export const parse = (source: string): ParseResult => {
  let text = '';
  let rest = source;
  const entities: Entity[] = [];

  while (rest !== '') {
    let match = rest.match(STRONG);
    if (match) {
      const matched = match[0];
      const content = match[1];
      entities.push({
        type: 'Strong',
        start: text.length,
        offset: content.length,
      });
      text += content;
      rest = rest.substr(matched.length);
      continue;
    }

    match = rest.match(URL);
    if (match) {
      const matched = match[0];
      entities.push({
        type: 'Link',
        href: matched,
        start: text.length,
        offset: matched.length,
      });
      text += matched;
      rest = rest.substr(matched.length);
      continue;
    }

    match = rest.match(LINK);
    if (match) {
      const matched = match[0];
      const content = match[1];
      const url = match[2];
      entities.push({
        type: 'Link',
        href: url,
        start: text.length,
        offset: content.length,
      });
      text += content;
      rest = rest.substr(matched.length);
      continue;
    }

    match = rest.match(TEXT);
    if (match) {
      const matched = match[0];
      text += matched;
      rest = rest.substr(matched.length);
    }
  }
  return { text, entities };
};
