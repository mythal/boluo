import { Member } from 'api';
import { X } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useCallback, useMemo } from 'react';
import Icon from 'ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';

interface Props {
  channelId: string;
  whisperToUsernames: string[];
}

export const ContentWhisperTo: FC<Props> = ({ channelId, whisperToUsernames }) => {
  const { data: members, isLoading } = useQueryChannelMembers(channelId);
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const removeUsername = useCallback((username: string) => () => {
    dispatch({ type: 'removeWhisperTarget', payload: { username } });
  }, [dispatch]);
  const addUsername = useCallback((username: string) => {
    dispatch({ type: 'addWhisperTarget', payload: { username } });
  }, [dispatch]);

  const whisperToAdd = useMemo(() => {
    if (!members) return null;
    return <WhisperToItemAdd members={members.members} add={addUsername} />;
  }, [addUsername, members]);

  const whisperToMembers: Member[] | null = useMemo(() => {
    if (!members) {
      return null;
    }
    return members.members.flatMap((member) => {
      if (whisperToUsernames.includes(member.user.username)) {
        return [member];
      } else {
        return [];
      }
    });
  }, [members, whisperToUsernames]);

  if (members == null || whisperToMembers == null || isLoading) {
    return <span>Whisper to ...</span>;
  }

  if (whisperToMembers.length === 0) {
    return (
      <span className="text-sm text-surface-600">
        Whisper to the Master only {whisperToAdd}
      </span>
    );
  }

  return (
    <span className="text-sm text-surface-600">
      Whisper to the Master and{' '}
      <span className="space-x-1">
        {whisperToMembers.map((member) => (
          <WhisperToItem key={member.user.id} member={member} remove={removeUsername(member.user.username)} />
        ))}
        {whisperToAdd}
      </span>
    </span>
  );
};

export const WhisperToItem: FC<{ member: Member; remove: () => void }> = ({ member, remove }) => {
  return (
    <button
      className="border rounded bg-lowest px-1 border-surface-500 hover:border-surface-800 hover:line-through"
      onClick={remove}
    >
      {member.user.nickname}
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
      className="border rounded appearance-none w-6 text-center bg-lowest hover:border-surface-400"
    >
      <option value="">
        +
      </option>
      {members.map((member) => (
        <option
          key={member.user.id}
          value={member.user.username}
        >
          {member.user.nickname}
        </option>
      ))}
    </select>
  );
};
