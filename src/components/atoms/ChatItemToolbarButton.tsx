import * as React from 'react';
import { fontBase, fontNormal, p, textXs } from '../../styles/atoms';
import { toolbarRadius } from '../chat/ItemToolbar';
import { darken } from 'polished';
import { css } from '@emotion/core';
import { SpriteSymbol } from '*.svg';
import Icon from '../../components/atoms/Icon';
import Tooltip, { TooltipProps } from '../../components/atoms/Tooltip';
import { textColor } from '../../styles/colors';
import rotateIcon from '../../assets/icons/rotate-cw.svg';
import { isMobile } from '../../utils/browser';

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
  &:disabled {
    background-color: transparent;
    filter: brightness(80%);
    &:hover {
      background-color: transparent;
      filter: brightness(80%);
    }
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

export interface ToolbarButtonProps {
  className?: string;
  on?: boolean;
  onClick: () => void;
  sprite: SpriteSymbol;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  info?: string;
  x?: TooltipProps['x'];
}

const container = css`
  ${[fontNormal, fontBase]};
  display: inline-block;
  position: relative;
  & .tooltip {
    visibility: hidden;
  }
  &:hover .tooltip {
    visibility: visible;
  }
`;

function ChatItemToolbarButton({
  onClick,
  sprite,
  className,
  on,
  title,
  info,
  x,
  loading = false,
  disabled = false,
}: ToolbarButtonProps) {
  return (
    <div css={container} className={className}>
      {!isMobile && (
        <Tooltip className="tooltip" x={x}>
          <div>{title}</div>
          {info && <div css={[textXs]}>{info}</div>}
        </Tooltip>
      )}
      <button css={style} data-on={on} onClick={onClick} disabled={loading || disabled}>
        <Icon spin={loading} sprite={loading ? rotateIcon : sprite} />
      </button>
    </div>
  );
}

export default React.memo(ChatItemToolbarButton);
