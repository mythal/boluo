import { useMe } from 'common';
import { HelpCircle, LogIn, Settings } from 'icons';
import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane, Pane } from '../../types/chat-pane';

interface Props {
  className?: string;
  isSettingsOpen: boolean;
  isHelpOpen: boolean;
  isLoginOpen: boolean;
  isExpand: boolean;
}

const SettingToggleButton: FC<{ on: boolean; isExpand: boolean }> = ({ on, isExpand }) => {
  const intl = useIntl();
  const dispatch = useChatPaneDispatch();
  const paneName = intl.formatMessage({ defaultMessage: 'Settings' });
  const label = on
    ? intl.formatMessage({ defaultMessage: 'Close {paneName}' }, { paneName })
    : intl.formatMessage({ defaultMessage: 'Open {paneName}' }, { paneName });
  const pane: Pane = makePane({ type: 'SETTINGS' });
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

const HelpToggleButton: FC<{ on: boolean; isExpand: boolean }> = ({ on, isExpand }) => {
  const intl = useIntl();
  const dispatch = useChatPaneDispatch();
  const paneName = intl.formatMessage({ defaultMessage: 'Help' });
  const label = on
    ? intl.formatMessage({ defaultMessage: 'Close {paneName}' }, { paneName })
    : intl.formatMessage({ defaultMessage: 'Open {paneName}' }, { paneName });
  const pane: Pane = makePane({ type: 'HELP' });
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

export const ChatSidebarFooter: FC<Props> = ({ className, isSettingsOpen, isHelpOpen, isExpand, isLoginOpen }) => {
  const me = useMe();
  return (
    <div className={className}>
      <HelpToggleButton on={isHelpOpen} isExpand={isExpand} />
      <SettingToggleButton on={isSettingsOpen} isExpand={isExpand} />
    </div>
  );
};
