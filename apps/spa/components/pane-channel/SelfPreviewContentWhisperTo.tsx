import { type Member } from '@boluo/api';
import { Plus, X } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { type FC, useCallback, useMemo, useState, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { FloatingPortal, offset, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import clsx from 'clsx';
import { Avatar } from '../account/Avatar';

interface Props {
  inGame: boolean;
  channelId: string;
  whisperToUsernames: string[];
}

export const ContentWhisperTo: FC<Props> = ({ channelId, whisperToUsernames, inGame }) => {
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

  const whisperToAdd = useMemo(() => {
    if (!channelMembers) return null;
    const members = channelMembers.members.filter((member) => !whisperToUsernames.includes(member.user.username));
    if (members.length === 0) return null;
    return <WhisperToItemAdd inGame={inGame} members={members} add={addUsername} />;
  }, [addUsername, channelMembers, inGame, whisperToUsernames]);

  const whisperToMembers: Member[] | null = useMemo(() => {
    if (!channelMembers) {
      return null;
    }
    return channelMembers.members.flatMap((member) => {
      if (whisperToUsernames.includes(member.user.username)) {
        return [member];
      } else {
        return [];
      }
    });
  }, [channelMembers, whisperToUsernames]);

  if (channelMembers == null || whisperToMembers == null || isLoading) {
    return (
      <span>
        <FormattedMessage defaultMessage="Whisper to …" />
      </span>
    );
  }

  if (whisperToMembers.length === 0) {
    return (
      <span className="text-surface-600 text-sm">
        <FormattedMessage defaultMessage="Whisper to the Master only" /> {whisperToAdd}
      </span>
    );
  }

  return (
    <span className="text-surface-600 text-sm">
      <FormattedMessage defaultMessage="Whisper to the Master and" />{' '}
      <span className="space-x-1">
        {whisperToMembers.map((member) => (
          <WhisperToItem
            inGame={inGame}
            key={member.user.id}
            member={member}
            remove={removeUsername(member.user.username)}
          />
        ))}
        {whisperToAdd}
      </span>
    </span>
  );
};

export const WhisperToItem: FC<{ member: Member; inGame: boolean; remove: () => void }> = ({
  member,
  remove,
  inGame,
}) => {
  const { nickname } = member.user;
  const { characterName } = member.channel;
  return (
    <button
      className="bg-lowest border-surface-100 hover:border-surface-300 rounded border px-1 hover:line-through"
      onClick={remove}
    >
      {inGame && characterName !== '' ? characterName : nickname}
      <Icon icon={X} />
    </button>
  );
};

export const WhisperToItemAdd: FC<{ inGame: boolean; members: Member[]; add: (username: string) => void }> = ({
  inGame,
  members,
  add,
}) => {
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
          'bg-preview-whisper-add-bg inline-flex rounded border px-0.5',
          open
            ? 'border-surface-300 translate-y-px'
            : 'border-transprent group-hover/item:border-surface-300 shadow-sm active:translate-y-px active:shadow-none',
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
            className="bg-menu-panel-bg max-h-72 overflow-y-auto rounded shadow-md"
          >
            {members.map((member) => (
              <MemberItem inGame={inGame} key={member.user.id} member={member} add={add} />
            ))}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const MemberItem: FC<{ member: Member; inGame: boolean; add: (username: string) => void }> = ({
  member,
  add,
  inGame,
}) => {
  const characterName: ReactNode = member.channel.characterName || (
    <span className="font-pixel text-text-lighter text-[12.5px]">[empty]</span>
  );
  const mainName: ReactNode = inGame ? characterName : member.user.nickname;
  const subName: ReactNode = inGame ? member.user.nickname : characterName;
  return (
    <button
      className="hover:bg-menu-item-hover-bg grid grid-cols-[2rem_10rem] grid-rows-2 items-center gap-x-1 px-2 py-1 text-left first:rounded-t-sm last:rounded-b-sm"
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
      />

      <div className="w-full truncate text-sm">{mainName}</div>
      <div className="text-text-light w-full truncate text-xs">{subName}</div>
    </button>
  );
};
