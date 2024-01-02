import { Filter } from 'icons';
import { useAtom } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Select } from 'ui/Select';
import { ChannelFilter, useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
}

export const ChannelHeaderFilter: FC<Props> = () => {
  const intl = useIntl();
  const items = useMemo(() => [
    { label: intl.formatMessage({ defaultMessage: 'All' }), value: 'ALL' },
    { label: intl.formatMessage({ defaultMessage: 'In Game' }), value: 'IN_GAME' },
    { label: intl.formatMessage({ defaultMessage: 'Out-Of-Character' }), value: 'OOC' },
  ], [intl]);
  const { filterAtom } = useChannelAtoms();
  const [filter, setFilter] = useAtom(filterAtom);
  return (
    <div className="flex-none">
      <label className="flex items-center">
        <span className="mr-1">
          <Filter />
        </span>
        <span className="mr-2">
          <FormattedMessage defaultMessage="Filter" />
        </span>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as ChannelFilter)}>
          {items.map(item => <option value={item.value}>{item.label}</option>)}
        </Select>
      </label>
    </div>
  );
};
