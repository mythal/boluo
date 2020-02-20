import React from 'react';
import { Entity } from '../entities';
import { ExprEntity } from './ExprEntity';

interface Props {
  text: string;
  entities: Entity[];
  seed?: number[];
}

export const MessageContent: React.FC<Props> = ({ text, entities, seed }) => {
  const content = [];
  for (let key = 0; key < entities.length; key += 1) {
    const entity = entities[key];
    if (entity.type === 'Expr') {
      content.push(<ExprEntity key={key} node={entity.node} seed={seed} />);
    } else if (entity.type === 'Text') {
      content.push(<span key={key}>{text.substr(entity.start, entity.offset)}</span>);
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
  return <div className="inline break-all">{content}</div>;
};
