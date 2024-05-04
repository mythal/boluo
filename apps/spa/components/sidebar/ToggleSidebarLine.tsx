import clsx from 'clsx';
import { PanelLeftOpen } from '@boluo/icons';
import { useAtom } from 'jotai';
import { FC, useCallback, useRef } from 'react';
import { useIntl } from 'react-intl';
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
        'group absolute left-full top-0 z-20 h-full w-[18px] cursor-pointer',
        isTouch ? '' : 'hover:bg-sidebar-toggler-hover/15',
      )}
      title={title}
    >
      {!isExpanded && (
        <div
          className={clsx(
            'text-text-lighter group-hover:text-text-base absolute left-1 top-2 z-30 box-border flex items-center justify-center text-base group-hover:shadow',
            'bg-sidebar-toggler-button-bg cursor-pointer rounded px-1',
          )}
        >
          <Icon icon={PanelLeftOpen} />
        </div>
      )}

      <div
        aria-expanded={isExpanded}
        className={clsx(
          'bg-sidebar-divider h-full w-[1px]',
          isTouch
            ? 'bg-sidebar-toggler-touch w-[4px] aria-expanded:w-[1px]'
            : 'group-hover:bg-sidebar-toggler-hover group-hover:w-[2px]',
        )}
      ></div>
    </button>
  );
};
