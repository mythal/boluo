import clsx from 'clsx';
import { useQueryUser } from '@boluo/common';
import { Lock, LockedHash } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import { ChannelAtoms, ChannelAtomsContext, useMakeChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { Compose } from '../compose/Compose';
import { useSendPreview } from '../compose/useSendPreview';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneLoading } from '../PaneLoading';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';
import { MemberList } from './MemberList';
import { FailedBanner } from '../common/FailedBanner';
import { PaneFailed } from '../pane-failed/PaneFailed';
import { ChannelContext } from '../../hooks/useChannel';

interface Props {
  channelId: string;
}

const SecretChannelInfo: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="pt-4 text-3xl">
        <Lock />
      </div>
      <div className="py-4">
        <FormattedMessage defaultMessage="This is a secret channel. You must be invited to join this channel." />
      </div>
    </div>
  );
};

export const ChatPaneChannel: FC<Props> = memo(({ channelId }) => {
  const { data: currentUser } = useQueryUser();
  const member = useMyChannelMember(channelId);
  const nickname = currentUser?.nickname ?? undefined;
  const { data: channel, isLoading, error } = useQueryChannel(channelId);
  const defaultInGame = channel?.type === 'IN_GAME';
  const atoms: ChannelAtoms = useMakeChannelAtoms(channelId, member.isOk ? member.some.channel : null, defaultInGame);
  useSendPreview(
    channelId,
    nickname,
    member.isOk ? member.some.channel.characterName : '',
    atoms.composeAtom,
    atoms.parsedAtom,
    defaultInGame,
  );
  const memberListState = useAtomValue(atoms.memberListStateAtom);
  let errorNode = null;
  if (error) {
    const title = <FormattedMessage defaultMessage="Failed to query the channel" />;
    errorNode = <FailedBanner error={error}>{title}</FailedBanner>;
    if (channel == null) {
      return (
        <PaneFailed
          error={error}
          title={title}
          message={<FormattedMessage defaultMessage="Please check your network connection and try again." />}
        />
      );
    }
  }
  if (isLoading || channel == null || (!channel.isPublic && member.isErr && member.err === 'LOADING')) {
    return <PaneLoading>{errorNode}</PaneLoading>;
  }
  if (!channel.isPublic && member == null) {
    return (
      <PaneBox
        header={
          <PaneHeaderBox icon={<LockedHash />}>
            <FormattedMessage defaultMessage="Secret Channel" />
          </PaneHeaderBox>
        }
      >
        {errorNode}
        <SecretChannelInfo className="p-4" />
      </PaneBox>
    );
  }
  return (
    <ChannelContext.Provider value={channel}>
      <ChannelAtomsContext.Provider value={atoms}>
        <PaneBox header={<ChannelHeader />} grow>
          {errorNode}
          <div
            className={clsx(
              'relative grid h-full grid-rows-[minmax(0,1fr)_auto]',
              memberListState === 'CLOSED' ? 'grid-cols-1' : '@md:grid-cols-[1fr_14rem] grid-cols-[1fr_10rem]',
            )}
          >
            <ChatContent className="relative" currentUser={currentUser} channelId={channelId} />
            {memberListState === 'RIGHT' && <MemberList myMember={member} channel={channel} />}
            {member.isOk ? <Compose channelAtoms={atoms} member={member.some} /> : null}
          </div>
        </PaneBox>
      </ChannelAtomsContext.Provider>
    </ChannelContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
