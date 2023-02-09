import styled from '@emotion/styled';
import Prando from 'prando';
import * as React from 'react';
import { Entity } from '../../interpreter/entities';
import { makeRng } from '../../interpreter/eval';
import { fontMono, link } from '../../styles/atoms';
import { white } from '../../styles/colors';
import { Code } from '../atoms/Code';
import ExternalLink from '../atoms/ExternalLink';
import { ExprEntity } from './ExprEntity';
import { codeBlockStyle } from './styles';

interface Props {
  text: string;
  entities: Entity[];
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

const Expr = styled.span`
  ${fontMono};
`;

function ItemContent({ text, entities, seed }: Props) {
  const content = [];
  let rng: Prando | undefined = undefined;

  for (let key = 0; key < entities.length; key += 1) {
    const entity = entities[key];
    if (entity.type === 'Expr') {
      rng = rng ?? makeRng(seed);
      content.push(
        <Expr key={key}>
          <ExprEntity node={entity.node} rng={rng} top />
        </Expr>,
      );
    } else if (entity.type === 'Text') {
      content.push(<Text key={key}>{text.substr(entity.start, entity.offset)}</Text>);
    } else if (entity.type === 'Link') {
      content.push(
        <ExternalLink css={link} key={key} to={entity.href}>
          {text.substr(entity.start, entity.offset)}
        </ExternalLink>,
      );
    } else if (entity.type === 'Strong') {
      content.push(<Strong key={key}>{text.substr(entity.start, entity.offset)}</Strong>);
    } else if (entity.type === 'Emphasis') {
      content.push(<Emphasis key={key}>{text.substr(entity.start, entity.offset)}</Emphasis>);
    } else if (entity.type === 'Code') {
      content.push(<Code key={key}>{text.substr(entity.start, entity.offset)}</Code>);
    } else if (entity.type === 'CodeBlock') {
      content.push(
        <pre css={codeBlockStyle} key={key}>
          {text.substr(entity.start, entity.offset)}
        </pre>,
      );
    }
  }
  return <React.Fragment>{content}</React.Fragment>;
}

export default React.memo(ItemContent);
