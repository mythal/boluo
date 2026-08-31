import * as React from 'react';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import { isMobile } from '../../utils/browser';
import { cls } from '../../utils/classnames';
import Icon, { type SvgIcon } from '../atoms/Icon';
import Tooltip, { type TooltipProps } from '../atoms/Tooltip';
const toolbarButtonClassName =
  'rounded-[4px] border-0 bg-transparent p-0 text-legacy-text hover:bg-legacy-transparent-800 active:bg-legacy-transparent-700 focus:outline-none disabled:bg-transparent disabled:brightness-[80%] disabled:hover:bg-transparent disabled:hover:brightness-[80%] data-[on=false]:text-legacy-chat-toolbar-text data-[on=false]:hover:bg-transparent data-[on=false]:hover:text-white data-[on=true]:bg-legacy-transparent-700 data-[on=true]:text-white data-[on=true]:hover:bg-[rgba(255,255,255,0.35)] data-[on=true]:active:bg-[rgba(255,255,255,0.25)]';

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
    <div
      className={cls(
        'group/toolbar-button font-legacy-sans relative inline-block font-normal',
        className,
      )}
    >
      {!isMobile && title.length > 0 && (
        <Tooltip className="invisible group-hover/toolbar-button:visible" x={x}>
          <div>{title}</div>
          {info && <div className="text-[0.75rem]">{info}</div>}
        </Tooltip>
      )}
      <button
        aria-label={title || undefined}
        className={cls(
          toolbarButtonClassName,
          size === 'normal' ? 'size-8 text-[1rem]' : 'size-10 text-[1.125rem]',
        )}
        data-size={size}
        data-on={on}
        onClick={onClick}
        disabled={loading || disabled}
        type="button"
      >
        <Icon spin={loading} icon={loading ? RotateCw : icon} />
      </button>
    </div>
  );
}

export default React.memo(ChatItemToolbarButton);
