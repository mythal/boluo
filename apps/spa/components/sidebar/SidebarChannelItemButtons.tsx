import { Plus, X } from '@boluo/icons';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { stopPropagation } from '@boluo/utils/browser';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useSetAtom } from 'jotai';
import { panesAtom } from '../../state/view.atoms';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { useIntl } from 'react-intl';

interface Props {
  active: boolean;
  channelId: string;
}

export const SidebarChannelItemButtons = ({ active, channelId }: Props) => {
  const paneLimit = usePaneLimit();
  const setPane = useSetAtom(panesAtom);
  const addPane = usePaneAdd();
  const intl = useIntl();
  const labelClose = intl.formatMessage({ defaultMessage: 'Close' });
  const labelOpenNew = intl.formatMessage({ defaultMessage: 'Open in new pane' });

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (active) {
      setPane((panes) =>
        panes.filter((pane) => pane.type !== 'CHANNEL' || pane.channelId !== channelId),
      );
    }
  };
  const handleNew = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addPane({ type: 'CHANNEL', channelId });
  };
  return (
    <div onClick={(e) => e.stopPropagation()} className="flex gap-1 px-1 py-2">
      {active && (
        <ButtonInline
          className="h-6 w-6"
          onClick={handleClose}
          aria-label={labelClose}
          title={labelClose}
        >
          <X />
        </ButtonInline>
      )}
      {paneLimit > 1 && (
        <ButtonInline className="h-6 w-6" onClick={handleNew} aria-label={labelOpenNew}>
          <Plus />
        </ButtonInline>
      )}
    </div>
  );
};
