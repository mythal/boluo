import { Archive } from 'icons';
import { useAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
}

export const ChannelHeaderFilterShowArchive: FC<Props> = () => {
  const { showArchivedAtom } = useChannelAtoms();
  const [show, setShow] = useAtom(showArchivedAtom);
  return (
    <label className="text-sm @md:text-base space-x-1 select-none">
      <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
      <span>
        <Icon icon={Archive} />
      </span>
      <span className="">
        <FormattedMessage defaultMessage="Show Archived" />
      </span>
    </label>
  );
};
