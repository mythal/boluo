import { Settings } from '@boluo/icons';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { usePaneToggle } from '../../hooks/usePaneToggle';

interface Props {
  on: boolean;
  isExpand: boolean;
}

export const SettingsToggleButton: FC<Props> = ({ on }) => {
  const intl = useIntl();
  const togglePane = usePaneToggle();
  const paneName = intl.formatMessage({ defaultMessage: 'Settings' });
  const label = on
    ? intl.formatMessage({ defaultMessage: 'Close {paneName}' }, { paneName })
    : intl.formatMessage({ defaultMessage: 'Open {paneName}' }, { paneName });
  return (
    <Button
      onClick={() => togglePane({ type: 'SETTINGS' })}
      title={label}
      aria-label={label}
      className="group"
      data-type="switch"
      data-small
      data-on={on}
    >
      <Settings />
    </Button>
  );
};
