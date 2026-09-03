import type Prando from 'prando';
import * as React from 'react';
import { type Entity, fromLegacyEntity } from '../../interpreter/entities';
import { makeRng } from '../../interpreter/eval';
import { type LegacyEntity } from '../../interpreter/legacy-entities';
import { Code } from '../atoms/Code';
import ExternalLink from '../atoms/ExternalLink';
import { ExprEntity } from './ExprEntity';

interface Props {
  text: string;
  entities: Array<Entity> | Array<LegacyEntity>;
  seed?: number[];
}

function ItemContent({ text, entities, seed }: Props) {
  const content = [];
  let rng: Prando | undefined = undefined;

  for (let key = 0; key < entities.length; key += 1) {
    const item = entities[key];
    const entity = 'offset' in item ? fromLegacyEntity(item) : item;
    if (entity.type === 'Expr') {
      rng = rng ?? makeRng(seed);
      content.push(
        <span className="font-legacy-mono" key={key}>
          <ExprEntity node={entity.node} rng={rng} top />
        </span>,
      );
    } else if (entity.type === 'Text') {
      content.push(
        <span className="whitespace-pre-wrap" key={key}>
          {text.slice(entity.start, entity.start + entity.len)}
        </span>,
      );
    } else if (entity.type === 'Link') {
      const href =
        typeof entity.href === 'string'
          ? entity.href
          : text.slice(entity.href.start, entity.href.start + entity.href.len);
      content.push(
        <ExternalLink key={key} to={href}>
          {text.slice(entity.child.start, entity.child.start + entity.child.len)}
        </ExternalLink>,
      );
    } else if (entity.type === 'Strong') {
      content.push(
        <strong className="whitespace-pre-wrap" key={key}>
          {text.slice(entity.child.start, entity.child.start + entity.child.len)}
        </strong>,
      );
    } else if (entity.type === 'Emphasis') {
      content.push(
        <em className="whitespace-pre-wrap text-white" key={key}>
          {text.slice(entity.child.start, entity.child.start + entity.child.len)}
        </em>,
      );
    } else if (entity.type === 'StrongEmphasis') {
      content.push(
        <strong className="whitespace-pre-wrap italic" key={key}>
          {text.slice(entity.child.start, entity.child.start + entity.child.len)}
        </strong>,
      );
    } else if (entity.type === 'Code') {
      content.push(
        <Code key={key}>
          {text.slice(entity.child.start, entity.child.start + entity.child.len)}
        </Code>,
      );
    } else if (entity.type === 'CodeBlock') {
      content.push(
        <pre
          className="legacy-chat-code-block bg-legacy-black text-legacy-green-500 overflow-auto rounded-[3px] px-2 py-1 text-[0.875rem] leading-[1em] font-normal break-keep whitespace-pre not-italic"
          key={key}
        >
          {text.slice(entity.child.start, entity.child.start + entity.child.len)}
        </pre>,
      );
    }
  }
  return <React.Fragment>{content}</React.Fragment>;
}

export default React.memo(ItemContent);
