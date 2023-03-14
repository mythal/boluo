import { Settings } from 'icons';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane } from '../../types/chat-pane';

interface Props {
  on: boolean;
  isExpand: boolean;
}

export const SettingsToggleButton: FC<Props> = ({ on, isExpand }) => {
  const intl = useIntl();
  const dispatch = useChatPaneDispatch();
  const paneName = intl.formatMessage({ defaultMessage: 'Settings' });
  const label = on
    ? intl.formatMessage({ defaultMessage: 'Close {paneName}' }, { paneName })
    : intl.formatMessage({ defaultMessage: 'Open {paneName}' }, { paneName });
  const pane = makePane({ type: 'SETTINGS' });
  return (
    <Button
      onClick={() => dispatch({ type: 'TOGGLE', pane })}
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
