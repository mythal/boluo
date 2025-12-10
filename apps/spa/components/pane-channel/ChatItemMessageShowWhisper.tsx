import { type ApiError, type Message } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { useSetAtom } from 'jotai';
import { type FC, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Button } from '@boluo/ui/Button';
import { chatAtom } from '../../state/chat.atoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';
import { useMember } from '../../hooks/useMember';

interface Props {
  messageId: string;
  userIdList: string[];
  channelId: string;
  className?: string;
}

export const ChatItemMessageShowWhisper: FC<Props> = ({
  messageId,
  userIdList,
  channelId,
  className,
}) => {
  const member = useMember();
  const { data: chanenlMembers } = useQueryChannelMembers(channelId);
  if (chanenlMembers == null || chanenlMembers.members.length === 0 || member == null) {
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
        dispatch({ type: 'messageEdited', payload: { message, channelId, oldPos: message.pos } });
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
    <Button
      ref={buttonRef}
      type="button"
      small
      disabled={isMutating}
      onClick={() => void trigger()}
    >
      <FormattedMessage defaultMessage="Show" />
    </Button>
  );
};
