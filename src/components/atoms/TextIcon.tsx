import React from 'react';
import styled from '@emotion/styled';
import { SpriteSymbol } from '*.svg';
import SpriteSvg from './SpriteSvg';
import { spacingN } from '../../styles/theme';

interface Props {
  sprite: SpriteSymbol;
  className?: string;
}

const Strut = styled.span`
  &::before {
    /*
    * https://juejin.im/entry/5bc441a5f265da0aca333506
    * https://codepen.io/airen/pen/pZVvyL
    */
    content: '\u200b';
  }
  display: inline-flex;
  align-items: center;

  padding: 0 ${spacingN(0.5)};
`;

function TextIcon({ sprite, className }: Props) {
  return (
    <Strut>
      <SpriteSvg sprite={sprite} className={className} width="1em" height="1em" fill="currentColor" />
    </Strut>
  );
}

export default React.memo(TextIcon);
