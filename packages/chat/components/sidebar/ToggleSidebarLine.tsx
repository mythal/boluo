import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Sidebar } from '@boluo/icons';
import { useAtom } from 'jotai';
import { FC, useCallback, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';
import { useIsTouch } from '../../hooks/useIsTouch';

interface Props {}

export const ToggleSidebarLine: FC<Props> = () => {
  const [isExpanded, setExpand] = useAtom(isSidebarExpandedAtom);
  const isExpandedRef = useRef(isExpanded);
  isExpandedRef.current = isExpanded;
  const intl = useIntl();
  const isTouch = useIsTouch();
  const title = intl.formatMessage({ defaultMessage: 'Toggle Sidebar' });
  const toggleSidebar = useCallback(() => setExpand((x) => !x), [setExpand]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={buttonRef}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        toggleSidebar();
      }}
      className={clsx(
        'group absolute left-0 top-0 z-20 h-full w-[14px] cursor-pointer',
        isTouch ? '' : 'hover:bg-sidebar-toggler-hover/15',
      )}
      title={title}
    >
      <div
        className={clsx(
          'bg-bg  text absolute top-[26%] z-30 box-content flex items-center justify-center text-lg',
          isTouch ? '' : 'group-hover:border-transprent',
          'h-[64px] w-[26px] -translate-x-[2px] -translate-y-[2px] cursor-pointer',
          'shadow-sidebar-border rounded-r-lg shadow-[0_0_0_1px]',
          isTouch ? '' : 'group-hover:shadow-sidebar-toggler-hover group-hover:shadow-[0_0_0_2px]',
        )}
      >
        <Icon icon={isExpanded ? ChevronLeft : ChevronRight} />
      </div>
      <div
        className={clsx(
          'bg-sidebar-divider h-full w-[1px]',
          isTouch ? '' : 'group-hover:bg-sidebar-toggler-hover group-hover:w-[2px]',
        )}
      ></div>
      {!isTouch && (
        <div className="bg-lowest absolute left-2 top-[calc(20%-3rem)] z-30 hidden w-max space-x-1 rounded-sm px-2 py-1 shadow-md group-hover:block">
          <span>
            <Icon icon={Sidebar} />
          </span>
          <span>
            <FormattedMessage defaultMessage="Toggle Sidebar" />
          </span>
        </div>
      )}
    </button>
  );
};
