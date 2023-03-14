import { HelpCircle } from 'icons';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane } from '../../types/chat-pane';

interface Props {
  on: boolean;
  isExpand: boolean;
}

export const HelpToggleButton: FC<Props> = ({ on, isExpand }) => {
  const intl = useIntl();
  const dispatch = useChatPaneDispatch();
  const paneName = intl.formatMessage({ defaultMessage: 'Help' });
  const label = on
    ? intl.formatMessage({ defaultMessage: 'Close {paneName}' }, { paneName })
    : intl.formatMessage({ defaultMessage: 'Open {paneName}' }, { paneName });
  const pane = makePane({ type: 'HELP' });
  return (
    <Button
      onClick={() => dispatch({ type: 'TOGGLE', pane })}
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
