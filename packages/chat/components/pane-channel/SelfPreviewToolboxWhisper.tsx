import { FC, useCallback, useEffect, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { selectAtom } from 'jotai/utils';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { ChannelMember, Member } from '@boluo/api';
import { X } from '@boluo/icons';
import { WhisperToItemAdd } from './SelfPreviewToolboxWhisperToAdd';

interface Props {
  myChannelMember: ChannelMember;
  updateFloating: () => void;
}

export const SelfPreviewToolboxWhisper: FC<Props> = ({ myChannelMember, updateFloating: update }) => {
  const { composeAtom, parsedAtom } = useChannelAtoms();
  const whisperToUsernamesAtom = useMemo(
    () => selectAtom(parsedAtom, (parsed) => parsed.whisperToUsernames),
    [parsedAtom],
  );
  const whisperToUsernames = useAtomValue(whisperToUsernamesAtom);
  const { data: channelMembers, isLoading } = useQueryChannelMembers(myChannelMember.channelId);
  const dispatch = useSetAtom(composeAtom);
  useEffect(() => {
    update();
  });
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

  const whisperToMembers: Member[] | null = useMemo(() => {
    if (!channelMembers || whisperToUsernames == null) {
      return null;
    }
    whisperToUsernames.flatMap((username) => {
      // FIXME: This is O(n^2)
      const member = channelMembers.members.find((member) => member.user.username === username);
      if (member == null) {
        return [];
      } else {
        return [member];
      }
    });

    return channelMembers.members.flatMap((member) => {
      if (whisperToUsernames.includes(member.user.username)) {
        return [member];
      } else {
        return [];
      }
    });
  }, [channelMembers, whisperToUsernames]);
  const whisperToAdd = useMemo(() => {
    if (!channelMembers || !whisperToUsernames) return null;
    const members = channelMembers.members.filter((member) => !whisperToUsernames.includes(member.user.username));
    if (members.length === 0) return null;
    return <WhisperToItemAdd members={members} add={addUsername} />;
  }, [addUsername, channelMembers, whisperToUsernames]);
  return (
    <div className="bg-surface-50 z-0 col-span-full w-[13rem] p-2 text-sm shadow-sm">
      <div className="pb-1 text-xs">
        <FormattedMessage defaultMessage="Only following people can see" />
      </div>

      <div className="flex flex-wrap gap-1">
        <div className="bg-surface-200 inline-flex rounded-sm px-2 py-1">
          <FormattedMessage defaultMessage="Game Master" />
        </div>
        {whisperToMembers?.map((member) => (
          <button
            key={member.user.id}
            className="bg-surface-200 inline-flex items-center gap-1 rounded-sm px-2 py-1 hover:line-through"
            onClick={removeUsername(member.user.username)}
          >
            {member.user.id === myChannelMember.userId ? (
              <FormattedMessage defaultMessage="You" />
            ) : (
              member.user.username
            )}
            <button>
              <X />
            </button>
          </button>
        ))}
        {whisperToAdd}
      </div>
    </div>
  );
};
