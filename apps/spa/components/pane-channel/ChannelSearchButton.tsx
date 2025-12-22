import Search from '@boluo/icons/Search';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { useAtom } from 'jotai';
import { type FC, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

export const ChannelSearchButton: FC = () => {
  const intl = useIntl();
  const { subPaneStateAtom } = useChannelAtoms();
  const [subPaneState, setSubPaneState] = useAtom(subPaneStateAtom);

  const toggle = useCallback(() => {
    setSubPaneState((prev) => (prev === 'SEARCH' ? 'NONE' : 'SEARCH'));
  }, [setSubPaneState]);

  return (
    <PaneHeaderButton
      active={subPaneState === 'SEARCH'}
      onClick={toggle}
      title={intl.formatMessage({ defaultMessage: 'Search messages' })}
    >
      <Search />
    </PaneHeaderButton>
  );
};
