import { type MemberWithUser } from '@boluo/api';
import { Plus, X } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { type FC, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import {
  FloatingPortal,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import clsx from 'clsx';
import { Avatar } from '@boluo/ui/users/Avatar';
import { useQueryAppSettings } from '@boluo/common/hooks/useQueryAppSettings';

interface Props {
  inGame: boolean;
  channelId: string;
  whisperToUsernames: string[];
  myId: string;
}

export const ContentWhisperTo: FC<Props> = ({ channelId, whisperToUsernames, inGame, myId }) => {
  const { data: appSettings } = useQueryAppSettings();
  const { data: channelMembers, isLoading } = useQueryChannelMembers(channelId);
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const removeUsername = useCallback(
    (username: string) => () => {
      dispatch({ type: 'removeWhisperTarget', payload: { username } });
    },
    [dispatch],
  );
  const addUsername = useCallback(
    (username: string) => {
      dispatch({ type: 'addWhisperTarget', payload: { username } });
    },
    [dispatch],
  );

  const memberMap: Record<string, MemberWithUser> = useMemo(() => {
    if (!channelMembers) return {};
    return Object.fromEntries(
      channelMembers.members.map((member) => [member.user.username, member]),
    );
  }, [channelMembers]);

  const whisperToAdd = useMemo(() => {
    if (!channelMembers) return null;
    const members = channelMembers.members.filter(
      (member) => !whisperToUsernames.includes(member.user.username),
    );
    if (members.length === 0) return null;
    return (
      <WhisperToItemAdd
        inGame={inGame}
        members={members}
        add={addUsername}
        mediaUrl={appSettings?.mediaUrl}
      />
    );
  }, [addUsername, channelMembers, inGame, whisperToUsernames, appSettings?.mediaUrl]);

  const whisperToMembers: MemberWithUser[] = useMemo(() => {
    return whisperToUsernames.flatMap((username) => {
      const member = memberMap[username];
      if (!member) return [];
      return [member];
    });
  }, [memberMap, whisperToUsernames]);

  if (channelMembers == null || isLoading) {
    return (
      <span>
        <FormattedMessage defaultMessage="Whisper to …" />
      </span>
    );
  }

  if (whisperToMembers.length === 0) {
    return (
      <span className="text-text-secondary text-sm">
        <FormattedMessage defaultMessage="Whisper to the Master only" /> {whisperToAdd}
      </span>
    );
  }

  return (
    <span className="text-text-secondary text-sm">
      <FormattedMessage defaultMessage="Whisper to the Master and" />{' '}
      <span className="space-x-1">
        {whisperToMembers.map((member) => (
          <WhisperToItem
            inGame={inGame}
            key={member.user.id}
            member={member}
            remove={removeUsername(member.user.username)}
            myself={member.user.id === myId}
          />
        ))}
        {whisperToAdd}
      </span>
    </span>
  );
};

export const WhisperToItem: FC<{
  member: MemberWithUser;
  inGame: boolean;
  remove: () => void;
  myself: boolean;
}> = ({ member, remove, inGame, myself }) => {
  const intl = useIntl();
  const { nickname } = member.user;
  const { characterName } = member.channel;
  let name;
  if (myself) {
    name = intl.formatMessage({ defaultMessage: 'Myself' });
  } else if (inGame && characterName !== '') {
    name = characterName;
  } else {
    name = nickname;
  }
  return (
    <button
      className="bg-surface-selectable-default border-border-subtle decoration-border-strong text-text-primary rounded border px-1 decoration-2 transition-colors hover:line-through"
      onClick={remove}
    >
      {name}
      <Icon icon={X} />
    </button>
  );
};

export const WhisperToItemAdd: FC<{
  inGame: boolean;
  members: MemberWithUser[];
  add: (username: string) => void;
  mediaUrl?: string | null | undefined;
}> = ({ inGame, members, add, mediaUrl }) => {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    placement: 'top-start',
    open,
    onOpenChange: setOpen,
    middleware: [offset({ mainAxis: -4 })],
  });
  const click = useClick(context, {});
  const dismiss = useDismiss(context, {});
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <button
        ref={refs.setReference}
        className={clsx(
          'bg-surface-raised text-text-primary inline-flex rounded border px-0.5 transition-all',
          open
            ? 'border-border-default translate-y-px shadow-inner'
            : 'border-border-subtle group-hover/item:border-border-default shadow-sm active:translate-y-px active:shadow-none',
        )}
        {...getReferenceProps()}
      >
        <Icon icon={Plus} />
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-surface-raised border-border-default max-h-72 overflow-y-auto rounded border shadow-md"
          >
            {members.map((member) => (
              <MemberItem
                inGame={inGame}
                key={member.user.id}
                member={member}
                add={add}
                mediaUrl={mediaUrl}
              />
            ))}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const MemberItem: FC<{
  member: MemberWithUser;
  inGame: boolean;
  add: (username: string) => void;
  mediaUrl?: string | null | undefined;
}> = ({ member, add, inGame, mediaUrl }) => {
  const characterName: ReactNode = member.channel.characterName || (
    <span className="font-pixel text-text-muted text-[12.5px]">[empty]</span>
  );
  const mainName: ReactNode = inGame ? characterName : member.user.nickname;
  const subName: ReactNode = inGame ? member.user.nickname : characterName;
  return (
    <button
      className="bg-surface-selectable-default hover:bg-surface-selectable-hover grid grid-cols-[2rem_10rem] grid-rows-2 items-center gap-x-1 px-2 py-1 text-left first:rounded-t-sm last:rounded-b-sm"
      onClick={() => {
        add(member.user.username);
      }}
    >
      <Avatar
        id={member.user.id}
        name={member.user.nickname}
        avatarId={member.user.avatarId}
        className="row-span-2 rounded-sm"
        size="2rem"
        mediaUrl={mediaUrl}
      />

      <div className="w-full truncate text-sm">{mainName}</div>
      <div className="text-text-secondary w-full truncate text-xs">{subName}</div>
    </button>
  );
};
