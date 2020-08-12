import * as React from 'react';
import { p, roundedPx, spacingN, textColor } from '@/styles/atoms';
import { toolbarRadius } from '@/components/molecules/ChatItemToolbar';
import { darken } from 'polished';
import { css } from '@emotion/core';
import { SpriteSymbol } from '*.svg';
import Icon from '@/components/atoms/Icon';

const style = css`
  border: none;
  background-color: transparent;
  color: ${textColor};
  ${[p(2), toolbarRadius]};

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  &:active {
    background-color: rgba(255, 255, 255, 0.3);
  }
  &:focus {
    outline: none;
  }

  &[data-on='true'] {
    background-color: rgba(255, 255, 255, 0.3);
    color: white;
    &:hover {
      background-color: rgba(255, 255, 255, 0.35);
    }
    &:active {
      background-color: rgba(255, 255, 255, 0.25);
    }
  }
  &[data-on='false'] {
    color: ${darken(0.35, textColor)};
    &:hover {
      color: white;
      background-color: transparent;
    }
  }
`;

interface Props {
  className?: string;
  on?: boolean;
  onClick: () => void;
  sprite: SpriteSymbol;
  title: string;
}

const tooltip = css`
  ${[p(2), roundedPx]};
  width: max-content;
  position: absolute;
  left: 50%;
  top: ${spacingN(-2)};
  z-index: 100;
  transform: translate(-50%, -100%);
  background-color: black;
`;

const container = css`
  display: inline-block;
  position: relative;
  & .css-${tooltip.name} {
    visibility: hidden;
  }
  &:hover .css-${tooltip.name} {
    visibility: visible;
  }
`;

function ChatItemToolbarButton({ onClick, sprite, className, on, title }: Props) {
  return (
    <div css={container}>
      <div css={tooltip}>{title}</div>
      <button css={style} data-on={on} className={className} onClick={onClick}>
        <Icon sprite={sprite} />
      </button>
    </div>
  );
}

export default React.memo(ChatItemToolbarButton);
