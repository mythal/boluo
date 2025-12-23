import Archive from '@boluo/icons/Archive';
import ArrowDownWideShort from '@boluo/icons/ArrowDownWideShort';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';
import React, { Suspense, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { type Channel, type ChannelWithMaybeMember } from '@boluo/api';
import { useQueryChannelList } from '@boluo/hooks/useQueryChannelList';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';
import Icon from '@boluo/ui/Icon';
import { SidebarChannelListSkeleton } from './SidebarChannelListSkeleton';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { SidebarChannelsHeaderNewChannel } from './SidebarChannelsHeaderNewChannel';
import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { SidebarChannelItem } from './SidebarChannelItem';

const SidebarChannelList = React.lazy(() => import('./SidebarChannelList'));

interface Props {
  spaceId: string;
}

export const SidebarChannels: FC<Props> = ({ spaceId }) => {
  const panes = useAtomValue(panesAtom);
  const [isReordering, setIsReordering] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const { data: channelWithMemberList } = useQueryChannelList(spaceId);
  const { data: currentUser } = useQueryCurrentUser();
  const myId = currentUser?.id;
  const activeChannelIds = useMemo(
    () =>
      panes.flatMap((pane) =>
        (pane.type === 'CHANNEL' ? [pane.channelId] : []).concat(
          pane.child?.pane.type === 'CHANNEL' ? [pane.child.pane.channelId] : [],
        ),
      ),
    [panes],
  );
  const { activeChannels, archivedChannels } = useMemo((): {
    activeChannels: ChannelWithMaybeMember[] | undefined;
    archivedChannels: ChannelWithMaybeMember[] | undefined;
  } => {
    if (!channelWithMemberList) {
      return { activeChannels: undefined, archivedChannels: undefined };
    }
    const grouped = channelWithMemberList.reduce<{
      activeChannels: ChannelWithMaybeMember[];
      archivedChannels: ChannelWithMaybeMember[];
    }>(
      (result, channelWithMember) => {
        const isArchived = channelWithMember.channel.isArchived ?? false;
        if (isArchived) {
          result.archivedChannels.push(channelWithMember);
        } else {
          result.activeChannels.push(channelWithMember);
        }
        return result;
      },
      { activeChannels: [], archivedChannels: [] },
    );
    return grouped;
  }, [channelWithMemberList]);

  const archivedChannelsSorted = useMemo(() => {
    if (archivedChannels == null) return archivedChannels;
    const getModifiedTime = (channel: Channel) => {
      const channelWithModified = channel as Channel & {
        modified?: string;
        updated?: string;
        lastModified?: string;
      };
      return new Date(
        channelWithModified.modified ??
          channelWithModified.updated ??
          channelWithModified.lastModified ??
          channel.created,
      ).getTime();
    };
    return [...archivedChannels].sort(
      (a, b) => getModifiedTime(b.channel) - getModifiedTime(a.channel),
    );
  }, [archivedChannels]);
  const archivedChannelIds = useMemo(
    () => archivedChannels?.map(({ channel }) => channel.id) ?? [],
    [archivedChannels],
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="text-text-secondary flex items-center gap-1 px-4 py-2 text-sm">
        <div className="grow">
          <FormattedMessage defaultMessage="Channels" />
        </div>

        {mySpaceMember?.isAdmin && (
          <>
            <SidebarChannelsHeaderNewChannel spaceId={spaceId} />
            <ButtonInline
              aria-pressed={isReordering}
              onClick={() => setIsReordering((prev) => !prev)}
            >
              <Icon icon={ArrowDownWideShort} className="mr-1" />
              <span className="text-xs">
                <FormattedMessage defaultMessage="Reorder" />
              </span>
            </ButtonInline>
          </>
        )}
      </div>
      <Suspense fallback={<SidebarChannelListSkeleton />}>
        {activeChannels == null ? (
          <SidebarChannelListSkeleton />
        ) : (
          <SidebarChannelList
            spaceId={spaceId}
            channelWithMemberList={activeChannels}
            isReordering={isReordering}
            activeChannelIds={activeChannelIds}
            myId={myId}
            archivedChannelIds={archivedChannelIds}
          />
        )}
      </Suspense>
      {archivedChannelsSorted != null && archivedChannelsSorted.length > 0 && (
        <>
          <SidebarItem
            icon={<Archive />}
            toggle
            active={showArchived}
            onClick={() => setShowArchived((prev) => !prev)}
          >
            <span className="">
              <FormattedMessage defaultMessage="Archived Channels" />
            </span>
          </SidebarItem>
          {showArchived && (
            <div className="pb-2">
              {archivedChannelsSorted.map(({ channel }) => (
                <SidebarChannelItem
                  key={channel.id}
                  channel={channel}
                  active={activeChannelIds.includes(channel.id)}
                  myId={myId}
                  disableOrderingContainer
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
