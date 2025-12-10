import { css } from '@emotion/react';
import { darken } from 'polished';
import * as React from 'react';
import RotateCw from '../../assets/icons/rotate-cw.svg';
import { fontBase, fontNormal, p, textBase, textLg, textXs } from '../../styles/atoms';
import { textColor } from '../../styles/colors';
import { isMobile } from '../../utils/browser';
import Icon, { type SvgIcon } from '../atoms/Icon';
import Tooltip, { type TooltipProps } from '../atoms/Tooltip';
import { toolbarRadius } from './ItemToolbar';

const style = css`
  border: none;
  background-color: transparent;
  color: ${textColor};
  ${[p(0), toolbarRadius]};

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

  &[data-size='normal'] {
    ${textBase};
    width: 2rem;
    height: 2rem;
  }

  &[data-size='large'] {
    ${textLg};
    width: 2.5rem;
    height: 2.5rem;
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
  onClick: React.MouseEventHandler;
  icon: SvgIcon;
  title?: string;
  size?: 'normal' | 'large';
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
  icon,
  className,
  on,
  title = '',
  info,
  x,
  loading = false,
  disabled = false,
  size = 'normal',
}: ToolbarButtonProps) {
  return (
    <div css={container} className={className}>
      {!isMobile && title.length > 0 && (
        <Tooltip className="tooltip" x={x}>
          <div>{title}</div>
          {info && <div css={[textXs]}>{info}</div>}
        </Tooltip>
      )}
      <button
        css={style}
        data-size={size}
        data-on={on}
        onClick={onClick}
        disabled={loading || disabled}
      >
        <Icon spin={loading} icon={loading ? RotateCw : icon} />
      </button>
    </div>
  );
}

export default React.memo(ChatItemToolbarButton);
