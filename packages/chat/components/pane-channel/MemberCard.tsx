import { Member, User, UserStatus } from 'api';
import { post } from 'api-browser';
import clsx from 'clsx';
import { useMe } from 'common';
import { Mask, UserX } from 'icons';
import React, { FC, ReactNode, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Badge } from 'ui/Badge';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';
import { Avatar } from '../account/Avatar';

const JUST_NOW = 1000 * 10;
const SECONDS_IN_MS = 1000;
const MINUTES_IN_MS = SECONDS_IN_MS * 60;
const HOURS_IN_MS = MINUTES_IN_MS * 60;
const DAYS_IN_MS = HOURS_IN_MS * 24;
const WEEKS_IN_MS = DAYS_IN_MS * 7;

const LastSeen: FC<{ timestamp: number; className?: string }> = React.memo(
  ({ timestamp: lastSeenTimeStamp, className }) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 2000);
      return () => clearInterval(interval);
    }, []);
    const intl = useIntl();
    const lastSeen = new Date(lastSeenTimeStamp);
    const diff = now - lastSeenTimeStamp;
    let timeText = lastSeen.toLocaleTimeString();
    if (diff < JUST_NOW) {
      timeText = intl.formatMessage({ defaultMessage: 'just now' });
    } else if (diff < MINUTES_IN_MS) {
      timeText = intl.formatMessage({ defaultMessage: '{seconds} seconds ago' }, {
        seconds: Math.floor(diff / SECONDS_IN_MS),
      });
    } else if (diff < HOURS_IN_MS) {
      timeText = intl.formatMessage({ defaultMessage: '{minutes} minutes ago' }, {
        minutes: Math.floor(diff / MINUTES_IN_MS),
      });
    } else if (diff < DAYS_IN_MS) {
      timeText = intl.formatMessage({ defaultMessage: '{hours} hours ago' }, {
        hours: Math.floor(diff / HOURS_IN_MS),
      });
    } else if (diff < WEEKS_IN_MS) {
      timeText = intl.formatMessage({ defaultMessage: '{days} days ago' }, {
        days: Math.floor(diff / DAYS_IN_MS),
      });
    }
    return (
      <span className={className}>
        <FormattedMessage defaultMessage="Last seen" /> <time dateTime={lastSeen.toISOString()}>{timeText}</time>
      </span>
    );
  },
);
LastSeen.displayName = 'LastSeen';

const Names: FC<{ username: string; nickname: string; characterName: string }> = (
  { username, nickname, characterName },
) => {
  if (characterName === '') {
    return (
      <div className="space-x-1">
        <span className="font-bold">{nickname}</span>
        <span className="text-surface-400">{username}</span>
      </div>
    );
  }
  return (
    <div>
      <div className="">
        <Icon icon={Mask} />{' '}
        <span className="font-bold">
          {characterName}
        </span>
      </div>
      <div className="text-sm space-x-1">
        <span className="text-surface-600">
          {nickname}
        </span>
        <span className="text-surface-400">{username}</span>
      </div>
    </div>
  );
};

const Badges: FC<{ thisIsMe: boolean; isMaster: boolean; isAdmin: boolean }> = ({ thisIsMe, isMaster, isAdmin }) => {
  const badges: ReactNode[] = [];
  if (thisIsMe) {
    badges.push(
      <Badge key="me">
        <FormattedMessage defaultMessage="Me" />
      </Badge>,
    );
  }
  if (isMaster) {
    badges.push(
      <Badge key="master">
        <FormattedMessage defaultMessage="Master" />
      </Badge>,
    );
  }
  if (isAdmin) {
    badges.push(
      <Badge key="admin">
        <FormattedMessage defaultMessage="Admin" />
      </Badge>,
    );
  }
  if (badges.length === 0) {
    return null;
  }
  return (
    <div className="flex gap-1">
      {badges}
    </div>
  );
};

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  member: Member;
  status?: UserStatus;
  canIKick?: boolean;
}

export const MemberCard = React.forwardRef<HTMLDivElement, Props>(({ member, canIKick, status, ...props }, ref) => {
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
  const intl = useIntl();
  let statusText = intl.formatMessage({ defaultMessage: 'Unknown' });
  if (status != null) {
    switch (status.kind) {
      case 'ONLINE':
        statusText = intl.formatMessage({ defaultMessage: 'Online' });
        break;
      case 'OFFLINE':
        statusText = intl.formatMessage({ defaultMessage: 'Offline' });
        break;
      case 'AWAY':
        statusText = intl.formatMessage({ defaultMessage: 'Away' });
        break;
    }
  }
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
          <div className="space-y-1">
            <Names
              username={member.user.username}
              nickname={member.user.nickname}
              characterName={member.channel.characterName}
            />

            {status != null && (
              <div className="text-sm space-x-1">
                {status.kind === 'ONLINE'
                  ? <span className={clsx(status.kind === 'ONLINE' ? 'text-green-600' : '')}>{statusText}</span>
                  : <LastSeen timestamp={status.timestamp} className="text-surface-500" />}
              </div>
            )}
            <Badges
              thisIsMe={thisIsMe}
              isAdmin={member.space.isAdmin}
              isMaster={member.channel.isMaster}
            />
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
