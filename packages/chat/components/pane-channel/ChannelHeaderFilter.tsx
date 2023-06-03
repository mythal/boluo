import { Filter } from 'icons';
import { useAtom } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Select } from 'ui';
import { SelectItem } from 'ui/Select';
import { ChannelFilter, useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
}

export const ChannelHeaderFilter: FC<Props> = () => {
  const intl = useIntl();
  const items = useMemo((): SelectItem[] => [
    { label: intl.formatMessage({ defaultMessage: 'All' }), value: 'ALL' },
    { label: intl.formatMessage({ defaultMessage: 'In Game' }), value: 'IN_GAME' },
    { label: intl.formatMessage({ defaultMessage: 'Out-Of-Character' }), value: 'OOC' },
  ], [intl]);
  const { filterAtom } = useChannelAtoms();
  const [filter, setFilter] = useAtom(filterAtom);
  return (
    <div>
      <label className="flex gap-2 items-center">
        <div className="flex gap1 items-center">
          <Filter />
          <FormattedMessage defaultMessage="Filter" />
        </div>
        <Select items={items} value={filter} onChange={(value) => setFilter(value as ChannelFilter)} />
      </label>
    </div>
  );
};
