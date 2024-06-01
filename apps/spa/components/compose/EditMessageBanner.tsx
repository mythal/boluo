import { type ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { selectAtom } from 'jotai/utils';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { chatAtom } from '../../state/chat.atoms';
import { useChannelId } from '../../hooks/useChannelId';
import { type Message, type User } from '@boluo/api';
import { FormattedMessage, useIntl } from 'react-intl';
import { Content } from '../pane-channel/Content';
import { messageToParsed } from '../../interpreter/to-parsed';
import { Name } from '../pane-channel/Name';
import { InComposeButton } from './InComposeButton';
import { Edit, X } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';

interface Props {
  currentUser: User;
}

export const EditMessageBanner = ({ currentUser }: Props) => {
  const channelId = useChannelId();
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const targetMessageIdAtom = useMemo(() => selectAtom(composeAtom, (compose) => compose.previewId), [composeAtom]);
  const targetMessageAtom = useMemo(
    () =>
      atom((get): Message | null => {
        const targetMessageId = get(targetMessageIdAtom);
        const chat = get(chatAtom);
        const channel = chat.channels[channelId];
        if (!channel) return null;
        return channel.messageMap[targetMessageId] ?? null;
      }),
    [channelId, targetMessageIdAtom],
  );
  const message = useAtomValue(targetMessageAtom);
  const intl = useIntl();
  const cancelEditTitle = intl.formatMessage({ defaultMessage: 'Cancel edit' });
  const handleCanelEdit = () => {
    dispatch({ type: 'reset', payload: {} });
  };

  const nameNode = useMemo(() => {
    if (!message) return null;
    return (
      <Name
        inGame={message.inGame}
        name={message.name}
        isMaster={message.isMaster}
        self={currentUser.id === message.senderId}
        user={null}
      />
    );
  }, [message, currentUser]);
  const parsed = useMemo(() => {
    if (!message) return null;
    return messageToParsed(message.text, message.entities);
  }, [message]);
  let content: ReactNode;
  if (!message || !parsed) {
    content = (
      <div>
        <div className="text-text-light text-xs">
          <FormattedMessage defaultMessage="Edit message" />
        </div>
        <div className="text-text-lighter text-sm">
          <FormattedMessage defaultMessage="Message not found" />
        </div>
      </div>
    );
  } else {
    content = (
      <div className="relative flex items-center gap-2">
        <div className="text-text-light w-[4.5rem] flex-initial text-sm">
          <Icon className="mr-1" icon={Edit} />
          <FormattedMessage defaultMessage="Editing" />
        </div>
        <div className="flex-grow">
          <div className="text-text-light text-xs"></div>
          <div className="text-text-light max-h-[3rem] overflow-y-auto text-sm">
            <Content
              source={message.text}
              entities={parsed.entities}
              isAction={message.isAction}
              isArchived={false}
              nameNode={nameNode}
            />
          </div>
        </div>
        <div className="text-sm">
          <InComposeButton label={cancelEditTitle} onClick={handleCanelEdit}>
            <X />
          </InComposeButton>
        </div>
      </div>
    );
  }
  return <div className="border-transprent border px-1 pb-1">{content}</div>;
};
