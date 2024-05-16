import { Archive } from '@boluo/icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

interface Props {}

export const ChannelHeaderFilterShowArchive: FC<Props> = () => {
  const { showArchivedAtom } = useChannelAtoms();
  const [show, setShow] = useAtom(showArchivedAtom);
  return (
    <SidebarHeaderButton size="small" active={show} onClick={() => setShow((x) => !x)}>
      <span>
        <Icon icon={Archive} />
      </span>
      <span className="@xl:inline hidden">
        <FormattedMessage defaultMessage="Archived" />
      </span>
    </SidebarHeaderButton>
  );
};
