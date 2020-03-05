import React from 'react';
import Prando from 'prando';
import { Entity } from '../../entities';
import { ExprEntity } from './ExprEntity';

interface Props {
  text: string;
  entities: Entity[];
  seed?: number[];
}

const makeRng = (seed?: number[]): Prando | undefined => {
  if (seed === undefined || seed.length !== 4) {
    return undefined;
  }
  let a = 0;
  for (const i of seed) {
    a = a * 256 + i;
  }
  return new Prando(a);
};

export const MessageContent = React.memo<Props>(({ text, entities, seed }) => {
  const content = [];
  let rng: Prando | undefined = undefined;
  for (let key = 0; key < entities.length; key += 1) {
    const entity = entities[key];
    if (entity.type === 'Expr') {
      rng = rng ?? makeRng(seed);
      content.push(
        <span key={key} className="font-mono inline-block">
          <ExprEntity node={entity.node} rng={rng} top />
        </span>
      );
    } else if (entity.type === 'Text') {
      content.push(
        <span className="whitespace-pre-wrap" key={key}>
          {text.substr(entity.start, entity.offset)}
        </span>
      );
    } else if (entity.type === 'Link') {
      content.push(
        <a key={key} href={entity.href}>
          {text.substr(entity.start, entity.offset)}
        </a>
      );
    } else if (entity.type === 'Strong') {
      content.push(<strong key={key}>{text.substr(entity.start, entity.offset)}</strong>);
    } else if (entity.type === 'Emphasis') {
      content.push(<em key={key}>{text.substr(entity.start, entity.offset)}</em>);
    }
  }
  return <>{content}</>;
});
