import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Sidebar } from 'icons';
import { useAtom } from 'jotai';
import { FC, MouseEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Icon from 'ui/Icon';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';

interface Props {}

export const ToggleSidebarLine: FC<Props> = () => {
  const [isExpanded, setExpand] = useAtom(isSidebarExpandedAtom);
  const isExpandedRef = useRef(isExpanded);
  isExpandedRef.current = isExpanded;
  const intl = useIntl();
  const title = intl.formatMessage({ defaultMessage: 'Toggle Sidebar' });
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const handleMouseDown = () => {
    setDragging(true);
  };
  const toggleSidebar = useCallback(() => setExpand((x) => !x), [setExpand]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const listener = () => {
      if (draggingRef.current) {
        setDragging(false);
        toggleSidebar();
      }
    };
    window.addEventListener('mouseup', listener);
    return () => window.removeEventListener('mouseup', listener);
  }, [toggleSidebar]);

  const previousTriggerTime = useRef(new Date().getTime());
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (buttonRef.current == null) return;
      const now = new Date().getTime();
      if (now - previousTriggerTime.current < 16) return;
      const NEAR_DISTANCE = 100;
      const near = buttonRef.current.getAttribute('data-near') === 'true';
      let distance = e.clientX;
      if (isExpandedRef.current) {
        const x = buttonRef.current.getBoundingClientRect().x;
        distance = Math.abs(e.clientX - x);
      }
      if (near && distance > NEAR_DISTANCE) {
        buttonRef.current.removeAttribute('data-near');
      } else if (!near && distance < NEAR_DISTANCE) {
        buttonRef.current.setAttribute('data-near', 'true');
      }
    };
    document.addEventListener('mousemove', listener, { passive: true });
    return () => document.removeEventListener('mousemove', listener);
  }, []);
  return (
    <button
      ref={buttonRef}
      className="group absolute left-0 top-0 z-20 h-full w-2 cursor-pointer hover:bg-blue-400/15 data-[near=true]:bg-blue-300/10"
      onMouseDown={handleMouseDown}
      title={title}
    >
      <div
        className={clsx(
          'bg-bg group-hover:border-transprent text absolute top-[20%] z-30 box-content flex items-center text-lg',
          'h-[40px] w-[20px] -translate-x-[2px] -translate-y-[2px] cursor-pointer',
          'shadow-surface-300 rounded-r-lg shadow-[0_0_0_1px] group-hover:shadow-[0_0_0_2px] group-hover:shadow-blue-300',
        )}
      >
        <Icon icon={isExpanded ? ChevronLeft : ChevronRight} />
      </div>
      <div
        className={clsx(
          'bg-sidebar-divider h-full w-[1px] group-hover:w-[2px] group-hover:bg-blue-300',
          dragging && 'bg-blue-500',
        )}
      ></div>
      <div className="bg-lowest absolute left-4 top-[calc(20%-3rem)] z-30 hidden w-max space-x-1 rounded-sm px-2 py-1 shadow-md group-hover:block">
        <span>
          <Icon icon={Sidebar} />
        </span>
        <span>
          <FormattedMessage defaultMessage="Toggle Sidebar" />
        </span>
      </div>
    </button>
  );
};
