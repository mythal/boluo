import { Member, User } from 'api';
import { post } from 'api-browser';
import { useMe } from 'common';
import { Mask, UserX } from 'icons';
import React, { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Badge } from 'ui/Badge';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';
import { Avatar } from '../account/Avatar';

const UserName: FC<{ user: User }> = ({ user }) => {
  return <span className="text-surface-400 ml-1">{user.username}</span>;
};

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  member: Member;
  canIKick?: boolean;
}

export const MemberCard = React.forwardRef<HTMLDivElement, Props>(({ member, canIKick, ...props }, ref) => {
  const me = useMe();
  const thisIsMe = me != null && me !== 'LOADING' && member.user.id === me.user.id;
  const [comfirmKick, setComfirmKick] = React.useState(false);
  const key = ['/channels/members', member.channel.channelId] as const;
  const { isMutating: isKicking, trigger: kick } = useSWRMutation(key, async ([_, channelId]) => {
    const result = await post(
      '/channels/kick',
      { channelId, spaceId: member.space.spaceId, userId: member.user.id },
      {},
    );
    return result.unwrap();
  }, {
    revalidate: false,
    populateCache: x => x,
    onSuccess: () => {
      setComfirmKick(false);
    },
  });
  return (
    <div {...props} ref={ref}>
      <div className="p-4 rounded shadow bg-lowest w-[20rem]">
        <div className="flex items-end">
          <Avatar
            size="6rem"
            className="float-left mr-2 rounded"
            id={member.user.id}
            avatarId={member.user.avatarId}
            name={member.user.nickname}
          />
          <div>
            {member.channel.characterName !== ''
              ? (
                <div>
                  <div className="">
                    <Icon icon={Mask} />{' '}
                    <span className="font-bold">
                      {member.channel.characterName}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-surface-600">
                      {member.user.nickname}
                    </span>
                    <UserName user={member.user} />
                  </div>
                </div>
              )
              : (
                <div>
                  <span className="font-bold">{member.user.nickname}</span>
                  <UserName user={member.user} />
                </div>
              )}
            <div className="flex gap-1 mt-1">
              {thisIsMe && (
                <Badge>
                  <FormattedMessage defaultMessage="Me" />
                </Badge>
              )}
              {member.channel.isMaster && (
                <Badge>
                  <FormattedMessage defaultMessage="Master" />
                </Badge>
              )}
              {member.space.isAdmin && (
                <Badge>
                  <FormattedMessage defaultMessage="Admin" />
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="py-4">
          <div className="text-sm whitespace-pre-line max-h-32 overflow-y-auto">
            {member.user.bio}
          </div>
        </div>

        <div className="">
          {canIKick && !thisIsMe && !comfirmKick && (
            <Button data-small onClick={() => setComfirmKick(true)}>
              <Icon icon={UserX} />
              <FormattedMessage defaultMessage="Kick" />
            </Button>
          )}
        </div>
        {comfirmKick && (
          <div className="text-sm pt-2">
            <div>
              <FormattedMessage
                defaultMessage="Are you sure you want to kick {nickname} ({username})?"
                values={{ nickname: member.user.nickname, username: member.user.username }}
              />
            </div>
            <div className="text-right pt-2">
              <Button data-small className="mx-1" onClick={() => setComfirmKick(false)}>
                <FormattedMessage defaultMessage="Cancel" />
              </Button>
              <Button data-small data-type="danger" disabled={isKicking} onClick={() => kick()}>
                <FormattedMessage defaultMessage="Yes, Kick" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
MemberCard.displayName = 'MemberCard';
