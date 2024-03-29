import { ApiError, Message } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { chatAtom } from '../../state/chat.atoms';

interface Props {
  messageId: string;
  userIdList: string[];
  channelId: string;
  className?: string;
}

export const ChatItemMessageShowWhisper: FC<Props> = ({ messageId, userIdList, channelId, className }) => {
  const key = ['/messages/query', messageId] as const;
  const dispatch = useSetAtom(chatAtom);
  const { trigger, isMutating } = useSWRMutation<Message | null, ApiError, typeof key>(
    key,
    async ([path, id]): Promise<Message | null> => {
      const result = await get(path, { id });
      return result.unwrap();
    },
    {
      onSuccess: (message) => {
        if (message == null) return;
        dispatch({ type: 'messageEdited', payload: { message, channelId } });
      },
    },
  );
  const member = useMyChannelMember(channelId);
  if (member == null || member === 'LOADING') {
    return null;
  }
  if (!member.channel.isMaster && !userIdList.includes(member.user.id)) {
    return (
      <span className={className}>
        <span className="italic">
          <FormattedMessage defaultMessage="You can't see" />
        </span>
      </span>
    );
  }
  return (
    <span className={className}>
      <Button type="button" data-small disabled={isMutating} onClick={() => trigger()}>
        <FormattedMessage defaultMessage="Show" />
      </Button>
    </span>
  );
};
