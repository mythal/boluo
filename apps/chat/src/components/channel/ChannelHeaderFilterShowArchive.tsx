import { Archive } from 'icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { toggle } from 'utils';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
}

export const ChannelHeaderFilterShowArchive: FC<Props> = () => {
  const { showArchivedAtom } = useChannelAtoms();
  const [show, setShow] = useAtom(showArchivedAtom);
  return (
    <Button data-type="switch" data-on={show} onClick={() => setShow(toggle)}>
      <Archive />
      {/* <FormattedMessage defaultMessage="Show Archived" /> */}
    </Button>
  );
};
