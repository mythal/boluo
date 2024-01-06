import clsx from 'clsx';
import { useMe } from 'common';
import { Lock, LockedHash } from 'icons';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import { ChannelAtoms, ChannelAtomsContext, useMakeChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { Compose } from '../compose/Compose';
import { useSendPreview } from '../compose/useSendPreview';
import { ErrorDisplay } from '../ErrorDisplay';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneLoading } from '../PaneLoading';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';
import { MemberList } from './MemberList';

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
  const me = useMe();
  const member = useMyChannelMember(channelId);
  const atoms: ChannelAtoms = useMakeChannelAtoms(channelId, member !== 'LOADING' ? member?.channel ?? null : null);
  const nickname = me != null && me !== 'LOADING' ? me.user.nickname : undefined;
  const { data: channel, isLoading, error } = useQueryChannel(channelId);
  useSendPreview(
    channelId,
    nickname,
    member == null || member === 'LOADING' ? '' : member.channel.characterName,
    atoms.composeAtom,
    atoms.parsedAtom,
  );
  const memberListState = useAtomValue(atoms.memberListStateAtom);
  if (error) {
    return (
      <div className="p-4">
        <ErrorDisplay error={error} />
      </div>
    );
  }
  if (channel == null || (!channel.isPublic && member === 'LOADING')) {
    return <PaneLoading />;
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
        <SecretChannelInfo className="p-4" />
      </PaneBox>
    );
  }
  return (
    <ChannelAtomsContext.Provider value={atoms}>
      <PaneBox header={<ChannelHeader />}>
        <div
          className={clsx(
            'relative grid h-full grid-rows-[minmax(0,1fr)_auto]',
            memberListState === 'CLOSED' ? 'grid-cols-1' : '@md:grid-cols-[1fr_14rem] grid-cols-[1fr_10rem]',
          )}
        >
          <ChatContent className="relative" me={me} channelId={channelId} />
          {memberListState === 'RIGHT' && <MemberList myMember={member} channel={channel} />}
          {me && me !== 'LOADING' && member !== 'LOADING' && member != null ? (
            <Compose me={me} className={clsx('col-span-full border-t p-2')} member={member.channel} />
          ) : null}
        </div>
      </PaneBox>
    </ChannelAtomsContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
