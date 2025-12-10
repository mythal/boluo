import styled from '@emotion/styled';
import type Prando from 'prando';
import * as React from 'react';
import { type Entity, fromLegacyEntity } from '../../interpreter/entities';
import { makeRng } from '../../interpreter/eval';
import { type LegacyEntity } from '../../interpreter/legacy-entities';
import { fontMono, link } from '../../styles/atoms';
import { white } from '../../styles/colors';
import { Code } from '../atoms/Code';
import ExternalLink from '../atoms/ExternalLink';
import { ExprEntity } from './ExprEntity';
import { codeBlockStyle } from './styles';

interface Props {
  text: string;
  entities: Array<Entity> | Array<LegacyEntity>;
  seed?: number[];
}

const Text = styled.span`
  white-space: pre-wrap;
`;

const Strong = styled.strong`
  white-space: pre-wrap;
`;

const Emphasis = styled.em`
  white-space: pre-wrap;
  color: ${white};
`;

const StrongEmphasis = styled.strong`
  white-space: pre-wrap;
  font-style: italic;
`;

const Expr = styled.span`
  ${fontMono};
`;

function ItemContent({ text, entities, seed }: Props) {
  const content = [];
  let rng: Prando | undefined = undefined;

  for (let key = 0; key < entities.length; key += 1) {
    const item = entities[key];
    const entity = 'offset' in item ? fromLegacyEntity(item) : item;
    if (entity.type === 'Expr') {
      rng = rng ?? makeRng(seed);
      content.push(
        <Expr key={key}>
          <ExprEntity node={entity.node} rng={rng} top />
        </Expr>,
      );
    } else if (entity.type === 'Text') {
      content.push(<Text key={key}>{text.substr(entity.start, entity.len)}</Text>);
    } else if (entity.type === 'Link') {
      const href =
        typeof entity.href === 'string'
          ? entity.href
          : text.substr(entity.href.start, entity.href.len);
      content.push(
        <ExternalLink css={link} key={key} to={href}>
          {text.substr(entity.child.start, entity.child.len)}
        </ExternalLink>,
      );
    } else if (entity.type === 'Strong') {
      content.push(<Strong key={key}>{text.substr(entity.child.start, entity.child.len)}</Strong>);
    } else if (entity.type === 'Emphasis') {
      content.push(
        <Emphasis key={key}>{text.substr(entity.child.start, entity.child.len)}</Emphasis>,
      );
    } else if (entity.type === 'StrongEmphasis') {
      content.push(
        <StrongEmphasis key={key}>
          {text.substr(entity.child.start, entity.child.len)}
        </StrongEmphasis>,
      );
    } else if (entity.type === 'Code') {
      content.push(<Code key={key}>{text.substr(entity.child.start, entity.child.len)}</Code>);
    } else if (entity.type === 'CodeBlock') {
      content.push(
        <pre css={codeBlockStyle} key={key}>
          {text.substr(entity.child.start, entity.child.len)}
        </pre>,
      );
    }
  }
  return <React.Fragment>{content}</React.Fragment>;
}

export default React.memo(ItemContent);
