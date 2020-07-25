import * as React from 'react';
import { roundedPx, uiShadow } from '../../styles/atoms';
import { css } from '@emotion/core';
import SpriteSvg from '../atoms/SpriteSvg';
import defaultAvatar from '../../assets/cultist.svg';

interface Props {
  size?: string;
  source: string | null;
  onClick?: () => void;
  className?: string;
}

const style = css`
  ${[uiShadow, roundedPx]};
  border: 0.15rem solid #000;
`;

function Avatar({ className, size, source, onClick }: Props) {
  size = size || '4rem';
  if (source) {
    return (
      <img
        alt="用户头像"
        onClick={onClick}
        className={className}
        css={[style, { height: size, width: size }]}
        src={source}
      />
    );
  } else {
    return (
      <SpriteSvg
        onClick={onClick}
        className={className}
        css={style}
        width={size}
        height={size}
        sprite={defaultAvatar}
      />
    );
  }
}

export default Avatar;
