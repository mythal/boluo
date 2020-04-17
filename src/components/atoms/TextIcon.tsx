import React from 'react';
import styled from '@emotion/styled';
import { BrowserSpriteSymbol } from '*.svg';

interface Props {
  sprite: BrowserSpriteSymbol;
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

  padding: 0 0.175em;
`;

function TextIcon({ sprite, className }: Props) {
  return (
    <Strut>
      <svg width="1em" height="1em" viewBox={sprite.viewBox} fill="currentColor" className={className}>
        <use xlinkHref={sprite.url} />
      </svg>
    </Strut>
  );
}

export default React.memo(TextIcon);
