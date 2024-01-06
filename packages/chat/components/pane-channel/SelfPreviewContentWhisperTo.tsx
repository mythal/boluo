import { Member } from 'api';
import { X } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useCallback, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';

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
    return <WhisperToItemAdd members={members} add={addUsername} />;
  }, [addUsername, channelMembers, whisperToUsernames]);

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

export const WhisperToItemAdd: FC<{ members: Member[]; add: (username: string) => void }> = ({ members, add }) => {
  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    e.preventDefault();
    if (e.target.value === '') return;
    add(e.target.value);
  };
  return (
    <select
      value=""
      onChange={handleChange}
      className="bg-lowest hover:border-surface-400 w-6 appearance-none rounded border text-center"
    >
      <option value="">+</option>
      {members.map((member) => {
        let name = member.user.nickname;
        if (member.channel.characterName !== '') {
          name += ` (${member.channel.characterName})`;
        }

        return (
          <option key={member.user.id} value={member.user.username}>
            {name}
          </option>
        );
      })}
    </select>
  );
};
