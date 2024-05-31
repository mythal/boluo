import { Filter } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Select } from '@boluo/ui/Select';
import { type ChannelFilter, useChannelAtoms } from '../../hooks/useChannelAtoms';
import Icon from '@boluo/ui/Icon';

interface Props {}

export const ChannelHeaderFilter: FC<Props> = () => {
  const intl = useIntl();
  const items = useMemo(
    () => [
      { label: intl.formatMessage({ defaultMessage: 'All' }), value: 'ALL' },
      { label: intl.formatMessage({ defaultMessage: 'In Game' }), value: 'IN_GAME' },
      { label: intl.formatMessage({ defaultMessage: 'Out-Of-Character' }), value: 'OOC' },
    ],
    [intl],
  );
  const { filterAtom } = useChannelAtoms();
  const [filter, setFilter] = useAtom(filterAtom);
  return (
    <label className="flex items-center gap-1">
      <Icon icon={Filter} />

      <span className="@xl:inline hidden flex-none">
        <FormattedMessage defaultMessage="Filter" />
      </span>
      <div className="w-20">
        <Select value={filter} onChange={(e) => setFilter(e.target.value as ChannelFilter)}>
          {items.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
    </label>
  );
};
