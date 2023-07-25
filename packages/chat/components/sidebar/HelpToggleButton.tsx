import { HelpCircle } from 'icons';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { usePaneToggle } from '../../hooks/usePaneToggle';

interface Props {
  on: boolean;
  isExpand: boolean;
}

export const HelpToggleButton: FC<Props> = ({ on, isExpand }) => {
  const intl = useIntl();
  const togglePane = usePaneToggle();
  const paneName = intl.formatMessage({ defaultMessage: 'Help' });
  const label = on
    ? intl.formatMessage({ defaultMessage: 'Close {paneName}' }, { paneName })
    : intl.formatMessage({ defaultMessage: 'Open {paneName}' }, { paneName });
  return (
    <Button
      onClick={() => togglePane({ type: 'HELP' })}
      title={label}
      aria-label={label}
      className="group"
      data-small
      data-type="switch"
      data-on={on}
    >
      <HelpCircle />
    </Button>
  );
};
