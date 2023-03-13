import clsx from 'clsx';
import { useMe } from 'common';
import { LogIn } from 'icons';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { Button, Icon } from 'ui';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane } from '../../types/chat-pane';
import { Avatar } from '../account/Avatar';

interface Props {
  onClick: () => void;
  isUserOperationOpen: boolean;
  isLoginOpen: boolean;
}

export const SidebarUserIcon: FC<Props> = ({ onClick, isLoginOpen, isUserOperationOpen }) => {
  const me = useMe();
  const dispatch = useChatPaneDispatch();
  const handleLoginClick = () => {
    const pane = makePane({ type: 'LOGIN' });
    dispatch({ type: 'TOGGLE', pane });
  };
  const intl = useIntl();
  const loginLabel = intl.formatMessage({ defaultMessage: 'Login' });

  if (!me) {
    return (
      <Button
        type="button"
        data-small
        data-type="switch"
        data-on={isLoginOpen}
        onClick={handleLoginClick}
        title={loginLabel}
        aria-label={loginLabel}
      >
        <LogIn />
      </Button>
    );
  }
  return (
    <button type="button" onClick={onClick}>
      <Avatar
        size={32}
        id={me.user.id}
        name={me.user.nickname}
        avatarId={me.user.avatarId}
        className={clsx(
          'w-8 h-8 rounded border cursor-pointer',
          isUserOperationOpen ? 'border-brand-600' : 'border-surface-300',
        )}
      />
    </button>
  );
};
