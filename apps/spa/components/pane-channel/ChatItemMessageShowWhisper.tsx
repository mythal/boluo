import { type ApiError, type Message } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { useSetAtom } from 'jotai';
import { type FC, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { chatAtom } from '../../state/chat.atoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';

interface Props {
  messageId: string;
  userIdList: string[];
  channelId: string;
  className?: string;
}

export const ChatItemMessageShowWhisper: FC<Props> = ({ messageId, userIdList, channelId, className }) => {
  const { data: chanenlMembers } = useQueryChannelMembers(channelId);
  if (chanenlMembers == null || chanenlMembers.members.length === 0 || chanenlMembers.selfIndex == null) {
    return null;
  }
  const member = chanenlMembers.members[chanenlMembers.selfIndex];
  if (member == null) {
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
      <ShowButton messageId={messageId} channelId={channelId} />
    </span>
  );
};

const ShowButton: FC<{ messageId: string; channelId: string }> = ({ messageId, channelId }) => {
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void trigger();
          }
        });
      },
      { rootMargin: '0px 0px 100px 0px' },
    );
    observer.observe(button);
    return () => {
      observer.unobserve(button);
    };
  }, [trigger]);

  return (
    <Button ref={buttonRef} type="button" data-small disabled={isMutating} onClick={() => trigger()}>
      <FormattedMessage defaultMessage="Show" />
    </Button>
  );
};
