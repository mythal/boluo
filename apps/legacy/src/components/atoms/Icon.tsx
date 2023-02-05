import { SpriteSymbol } from '*.svg';
import styled from '@emotion/styled';
import React from 'react';
import rotate from '../../assets/icons/rotate-cw.svg';
import { spacingN, spin as spinStyle } from '../../styles/atoms';
import SpriteSvg from './SpriteSvg';

interface Props {
  sprite: SpriteSymbol;
  title?: string;
  className?: string;
  noStrut?: boolean;
  spin?: boolean;
  loading?: boolean;
}

const Strut = styled.span`
  &[data-strut='true'] {
    &::before {
      /*
      * https://juejin.im/entry/5bc441a5f265da0aca333506
      * https://codepen.io/airen/pen/pZVvyL
      */
      content: '\u200b';
    }
    display: inline-flex;
    align-items: center;
  }
  font-size: 1em;

  padding: 0 ${spacingN(0.5)};
`;

function Icon({ sprite, className, noStrut, title, spin, loading }: Props) {
  if (loading) {
    spin = true;
    sprite = rotate;
  }
  return (
    <Strut data-strut={!noStrut} title={title}>
      <SpriteSvg
        css={[spin ? spinStyle : undefined]}
        sprite={sprite}
        className={className}
        width="1em"
        height="1em"
        fill="currentColor"
      />
    </Strut>
  );
}

export default React.memo(Icon);
