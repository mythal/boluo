import * as React from 'react';
import styled from '@emotion/styled';
import { fontMono, link, textBase, textColor, textLg } from '@/styles/atoms';
import { darken } from 'polished';
import Prando from 'prando';
import { Entity } from '@/interpreter/entities';
import { ExprEntity } from './ExprEntity';

interface Props {
  text: string;
  action: boolean;
  inGame: boolean;
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

const Content = styled.div`
  grid-area: content;
  line-height: 1.6em;

  &[data-action='true'] {
    font-style: italic;
  }

  &[data-in-game='true'] {
    ${textLg};
  }
  &[data-in-game='false'] {
    ${textBase};
    color: ${darken(0.1, textColor)};
  }
`;

const Text = styled.span`
  white-space: pre-wrap;
`;

const Strong = styled.strong``;

const Emphasis = styled.em``;

const MessageLink = styled.a`
  ${link};
`;

const Expr = styled.span`
  ${fontMono};
`;

function ChatItemContent({ text, action, entities, inGame, seed }: Props) {
  const content = [];
  let rng: Prando | undefined = undefined;

  for (let key = 0; key < entities.length; key += 1) {
    const entity = entities[key];
    if (entity.type === 'Expr') {
      rng = rng ?? makeRng(seed);
      content.push(
        <Expr key={key}>
          <ExprEntity node={entity.node} rng={rng} top />
        </Expr>
      );
    } else if (entity.type === 'Text') {
      content.push(<Text key={key}>{text.substr(entity.start, entity.offset)}</Text>);
    } else if (entity.type === 'Link') {
      content.push(
        <MessageLink key={key} href={entity.href}>
          {text.substr(entity.start, entity.offset)}
        </MessageLink>
      );
    } else if (entity.type === 'Strong') {
      content.push(<Strong key={key}>{text.substr(entity.start, entity.offset)}</Strong>);
    } else if (entity.type === 'Emphasis') {
      content.push(<Emphasis key={key}>{text.substr(entity.start, entity.offset)}</Emphasis>);
    }
  }
  return (
    <Content data-action={action} data-in-game={inGame}>
      {content}
    </Content>
  );
}

export default React.memo(ChatItemContent);
