import {
  type Channel,
  type ChannelMember,
  type SpaceMember,
  type User,
  type UserStatus,
} from '@boluo/api';
import { post } from '@boluo/api-browser';
import clsx from 'clsx';
import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';
import { Gamemaster, Mask, UserCog, UserPlus, UserX } from '@boluo/icons';
import React, { type FC, type ReactNode, useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import useSWRMutation from 'swr/mutation';
import { Badge } from '@boluo/ui/Badge';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { Avatar } from '@boluo/ui/users/Avatar';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { useQueryAppSettings } from '@boluo/common/hooks/useQueryAppSettings';

const JUST_NOW = 1000 * 10;
const SECONDS_IN_MS = 1000;
const MINUTES_IN_MS = SECONDS_IN_MS * 60;
const HOURS_IN_MS = MINUTES_IN_MS * 60;
const DAYS_IN_MS = HOURS_IN_MS * 24;
const WEEKS_IN_MS = DAYS_IN_MS * 7;

const EditMasterCheckBox: FC<{ channelMember: ChannelMember }> = ({ channelMember }) => {
  const key = ['/channels/members', channelMember.channelId] as const;
  const { isMutating: isEditing, trigger: edit } = useSWRMutation(key, async ([_, channelId]) => {
    const result = await post('/channels/edit_master', null, {
      channelId,
      userId: channelMember.userId,
      grantOrRevoke: channelMember.isMaster ? 'REVOKE' : 'GRANT',
    });
    return result.unwrap();
  });

  return (
    <label className="group grid grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-1 gap-y-0.5">
      <input
        type="checkbox"
        checked={channelMember.isMaster}
        onChange={() => void edit()}
        disabled={isEditing}
      />
      <span className="space-x-1">
        <span>
          <FormattedMessage defaultMessage="Game Master" />
        </span>
        <Icon icon={Gamemaster} className={channelMember.isMaster ? '' : 'text-text-subtle'} />
      </span>
      <span className="text-text-secondary group-hover:text-text-primary col-start-2 text-sm">
        A game master can read whispers, kick members, move messages, and other.
      </span>
    </label>
  );
};

const InviteButton: FC<{ userId: string; channelId: string }> = ({ userId, channelId }) => {
  const key = ['/channels/members', channelId] as const;
  const { isMutating: isInviting, trigger: invite } = useSWRMutation(
    key,
    async ([_, channelId]) => {
      const result = await post('/channels/add_member', null, {
        channelId,
        userId,
        characterName: '',
      });
      return result.unwrap();
    },
  );
  return (
    <Button small disabled={isInviting} onClick={() => void invite()}>
      <Icon icon={UserPlus} />
      <FormattedMessage defaultMessage="Invite" />
    </Button>
  );
};

const ConfirmLeave: FC<{ channelId: string; channelName: string; dismiss: () => void }> = ({
  channelId,
  dismiss,
  channelName,
}) => {
  const key = ['/channels/members', channelId] as const;
  const { isMutating: isKicking, trigger: kick } = useSWRMutation(
    key,
    async ([_, channelId]) => {
      const result = await post('/channels/leave', { id: channelId }, {});
      return result.unwrap();
    },
    {
      onSuccess: dismiss,
    },
  );
  return (
    <div className="pt-2 text-sm">
      <div>
        <FormattedMessage
          defaultMessage="Are you sure you want to leave {channelName}?"
          values={{ channelName }}
        />
      </div>
      <div className="pt-2 text-right">
        <Button small className="mx-1" onClick={dismiss}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button small variant="danger" disabled={isKicking} onClick={() => void kick()}>
          <FormattedMessage defaultMessage="Leave" />
        </Button>
      </div>
    </div>
  );
};
const ConfirmKick: FC<{
  spaceId: string;
  channelId: string;
  userId: string;
  nickname: string;
  username: string;
  dismiss: () => void;
}> = ({ userId, nickname, username, spaceId, channelId, dismiss }) => {
  const key = ['/channels/members', channelId] as const;
  const { isMutating: isKicking, trigger: kick } = useSWRMutation(
    key,
    async ([_, channelId]) => {
      const result = await post('/channels/kick', { channelId, spaceId, userId }, {});
      return result.unwrap();
    },
    {
      revalidate: false,
      populateCache: (x) => x,
      onSuccess: dismiss,
    },
  );
  return (
    <div className="pt-2 text-sm">
      <div>
        <FormattedMessage
          defaultMessage="Are you sure you want to kick {nickname} ({username})?"
          values={{ nickname, username }}
        />
      </div>
      <div className="pt-2 text-right">
        <Button small className="mx-1" onClick={dismiss}>
          <FormattedMessage defaultMessage="Cancel" />
        </Button>
        <Button small variant="danger" disabled={isKicking} onClick={() => void kick()}>
          <FormattedMessage defaultMessage="Yes, Kick" />
        </Button>
      </div>
    </div>
  );
};

const LastSeen = React.memo(
  ({ timestamp: lastSeenTimeStamp, className }: { timestamp: number; className?: string }) => {
    const [now, setNow] = useState(0);
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
      timeText = intl.formatMessage(
        { defaultMessage: '{seconds} seconds ago' },
        {
          seconds: Math.floor(diff / SECONDS_IN_MS),
        },
      );
    } else if (diff < HOURS_IN_MS) {
      timeText = intl.formatMessage(
        { defaultMessage: '{minutes} minutes ago' },
        {
          minutes: Math.floor(diff / MINUTES_IN_MS),
        },
      );
    } else if (diff < DAYS_IN_MS) {
      timeText = intl.formatMessage(
        { defaultMessage: '{hours} hours ago' },
        {
          hours: Math.floor(diff / HOURS_IN_MS),
        },
      );
    } else if (diff < WEEKS_IN_MS) {
      timeText = intl.formatMessage(
        { defaultMessage: '{days} days ago' },
        {
          days: Math.floor(diff / DAYS_IN_MS),
        },
      );
    }
    return (
      <span className={className}>
        <FormattedMessage defaultMessage="Last seen" />{' '}
        <time dateTime={lastSeen.toISOString()}>{timeText}</time>
      </span>
    );
  },
);
LastSeen.displayName = 'LastSeen';

const Names: FC<{ username: string; nickname: string; characterName: string }> = ({
  username,
  nickname,
  characterName,
}) => {
  if (characterName === '') {
    return (
      <div className="space-x-1">
        <span className="font-bold">{nickname}</span>
        <span className="text-text-secondary">{username}</span>
      </div>
    );
  }
  return (
    <div>
      <div className="">
        <Icon icon={Mask} /> <span className="font-bold">{characterName}</span>
      </div>
      <div className="space-x-1 text-sm">
        <span className="text-text-secondary">{nickname}</span>
        <span className="text-text-secondary">{username}</span>
      </div>
    </div>
  );
};

const Badges: FC<{ thisIsMe: boolean; isMaster: boolean; isAdmin: boolean }> = ({
  thisIsMe,
  isMaster,
  isAdmin,
}) => {
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
  return <div className="flex gap-1">{badges}</div>;
};

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  channel: Channel;
  user: User;
  spaceMember: SpaceMember;
  channelMember?: ChannelMember;
  status?: UserStatus;
  canIKick?: boolean;
  canIInvite?: boolean;
  canIEditMaster?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

export const MemberCard: React.FC<Props> = ({
  user,
  spaceMember,
  channelMember,
  canIKick = false,
  canIInvite = false,
  canIEditMaster = false,
  status,
  channel,
  ref,
  ...props
}) => {
  const { data: currentUser } = useQueryCurrentUser();
  const { data: appSettings } = useQueryAppSettings();
  const thisIsMe = user.id === currentUser?.id;
  const canIManage = canIKick || canIInvite || canIEditMaster;
  const [uiState, setUiState] = useState<'VIEW' | 'MANAGE' | 'CONFIRM_KICK' | 'CONFIRM_LEAVE'>(
    canIInvite ? 'MANAGE' : 'VIEW',
  );
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
    <div {...props} ref={ref} className="w-[20rem]">
      <FloatingBox className="p-3">
        <div className="flex items-end">
          <Avatar
            size="6rem"
            className="float-left mr-2 rounded"
            id={user.id}
            avatarId={user.avatarId}
            name={user.nickname}
            mediaUrl={appSettings?.mediaUrl}
          />
          <div className="space-y-1">
            <Names
              username={user.username}
              nickname={user.nickname}
              characterName={channelMember?.characterName ?? ''}
            />

            {status != null && (
              <div className="space-x-1 text-sm">
                {status.kind === 'ONLINE' ? (
                  <span className={clsx(status.kind === 'ONLINE' ? 'text-state-success-text' : '')}>
                    {statusText}
                  </span>
                ) : (
                  <LastSeen timestamp={status.timestamp} className="text-text-muted" />
                )}
              </div>
            )}
            <Badges
              thisIsMe={thisIsMe}
              isAdmin={spaceMember.isAdmin}
              isMaster={channelMember?.isMaster ?? false}
            />
          </div>
        </div>
        {user.bio !== '' && (
          <div className="pt-4">
            <div className="max-h-32 overflow-y-auto text-sm whitespace-pre-line">{user.bio}</div>
          </div>
        )}
        {uiState === 'VIEW' && canIManage && (
          <div className="flex justify-end gap-1 pt-4">
            {thisIsMe && channelMember != null && (
              <Button small onClick={() => setUiState('CONFIRM_LEAVE')}>
                <Icon icon={UserX} />
                <FormattedMessage defaultMessage="Leave" />
              </Button>
            )}
            <Button
              small
              onClick={() => setUiState((x) => (x === 'VIEW' ? 'MANAGE' : 'VIEW'))}
              title={intl.formatMessage({ defaultMessage: 'Manage' })}
            >
              <Icon icon={UserCog} />
            </Button>
          </div>
        )}

        {uiState === 'MANAGE' && (
          <div className="pt-4 pb-2">
            {canIEditMaster && channelMember?.channelId === channel.id && (
              <EditMasterCheckBox channelMember={channelMember} />
            )}
          </div>
        )}

        {uiState === 'MANAGE' && (
          <div className="flex gap-1 pt-4">
            {canIKick && !thisIsMe && (
              <Button small onClick={() => setUiState('CONFIRM_KICK')}>
                <Icon icon={UserX} />
                <FormattedMessage defaultMessage="Kick this member" />
              </Button>
            )}
            {canIInvite && channelMember?.channelId !== channel.id && !thisIsMe && (
              <InviteButton userId={user.id} channelId={channel.id} />
            )}

            {thisIsMe && channelMember?.channelId === channel.id && (
              <Button small onClick={() => setUiState('CONFIRM_LEAVE')}>
                <Icon icon={UserX} />
                <FormattedMessage defaultMessage="Leave" />
              </Button>
            )}

            <Button small onClick={() => setUiState('VIEW')}>
              <FormattedMessage defaultMessage="Done" />
            </Button>
          </div>
        )}

        {uiState === 'CONFIRM_KICK' && (
          <ConfirmKick
            spaceId={spaceMember.spaceId}
            channelId={channel.id}
            userId={user.id}
            nickname={user.nickname}
            username={user.username}
            dismiss={() => setUiState('VIEW')}
          />
        )}
        {uiState === 'CONFIRM_LEAVE' && (
          <ConfirmLeave
            channelId={channel.id}
            channelName={channel.name}
            dismiss={() => setUiState('VIEW')}
          />
        )}
      </FloatingBox>
    </div>
  );
};
