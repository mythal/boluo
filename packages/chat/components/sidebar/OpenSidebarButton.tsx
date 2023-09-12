import { Sidebar } from 'icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';

interface Props {}

export const OpenSidebarButton: FC<Props> = () => {
  const [isExpanded, setExpand] = useAtom(isSidebarExpandedAtom);
  const intl = useIntl();
  const title = intl.formatMessage({ defaultMessage: 'Open Sidebar' });
  if (isExpanded) return null;
  return (
    <div className="fixed z-10 -left-[5px] -top-[2px]">
      <button
        onClick={() => setExpand(true)}
        title={title}
        className="rounded-sm bg-lowest border border-surface-900 p-1 shadow-1/2 shadow-surface-500/10"
      >
        <Sidebar className="w-6 h-6" />
      </button>
    </div>
  );
};
