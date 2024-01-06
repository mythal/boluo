import clsx from 'clsx';
import { Sidebar } from 'icons';
import { useAtom } from 'jotai';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Icon from 'ui/Icon';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';

interface Props {}

export const ToggleSidebarLine: FC<Props> = () => {
  const [isExpanded, setExpand] = useAtom(isSidebarExpandedAtom);
  const intl = useIntl();
  const title = intl.formatMessage({ defaultMessage: 'Open Sidebar' });
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  const handleMouseDown = () => {
    setDragging(true);
  };
  const toggleSidebar = useCallback(() => setExpand((x) => !x), [setExpand]);
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
  return (
    <button
      className="absolute z-20 left-0 top-0 h-full w-3 group cursor-col-resize"
      onMouseDown={handleMouseDown}
      onClick={toggleSidebar}
      title={title}
    >
      <div
        className={clsx(
          'h-full w-[1px] group-hover:w-[2px] bg-surface-300 group-hover:bg-blue-300',
          dragging && 'bg-blue-500',
        )}
      ></div>
      <div className="hidden group-hover:block z-30 absolute w-max top-2 left-2 rounded-sm bg-highest text-lowest px-2 py-1 space-x-1">
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
