import { Sidebar } from 'icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { isSidebarExpandedAtom } from '../../state/ui.atoms';

interface Props {}

export const OpenSidebarButton: FC<Props> = () => {
  const [isExpanded, setExpand] = useAtom(isSidebarExpandedAtom);
  const intl = useIntl();
  const title = intl.formatMessage({ defaultMessage: 'Open sidebar' });
  if (isExpanded) return null;
  return (
    <div className="fixed z-10 -left-[5px] top-[24px]">
      <button
        onClick={() => setExpand(true)}
        title={title}
        className="rounded border bg-lowest/40 hover:bg-surface-200/60 hover:border-surface-300 p-1 shadow-sm"
      >
        <Sidebar className="w-6 h-6" />
      </button>
    </div>
  );
};
