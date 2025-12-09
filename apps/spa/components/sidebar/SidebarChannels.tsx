import { ArrowDownWideShort, Plus } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';
import React, { Suspense, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useQueryChannelList } from '../../hooks/useQueryChannelList';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';
import Icon from '@boluo/ui/Icon';
import { SidebarChannelListSkeleton } from './SidebarChannelListSkeleton';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { SidebarChannelsHeaderNewChannel } from './SidebarChannelsHeaderNewChannel';
import { findPane } from '../../state/view.utils';

const SidebarChannelList = React.lazy(() => import('./SidebarChannelList'));

interface Props {
  spaceId: string;
}

export const SidebarChannels: FC<Props> = ({ spaceId }) => {
  const panes = useAtomValue(panesAtom);
  const [isReordering, setIsReordering] = useState(false);
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const { data: channelWithMemberList } = useQueryChannelList(spaceId);
  const togglePane = usePaneToggle();
  const toggleCreateChannelPane = () => {
    togglePane({ type: 'CREATE_CHANNEL', spaceId });
  };
  const isCreateChannelPaneOpened = useMemo(
    () => findPane(panes, (pane) => pane.type === 'CREATE_CHANNEL') !== null,
    [panes],
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
        {channelWithMemberList == null ? (
          <SidebarChannelListSkeleton />
        ) : (
          <SidebarChannelList
            spaceId={spaceId}
            channelWithMemberList={channelWithMemberList}
            isReordering={isReordering}
          />
        )}
      </Suspense>
      {mySpaceMember?.isAdmin && (
        <SidebarItem
          icon={<Plus />}
          toggle
          active={isCreateChannelPaneOpened}
          onClick={toggleCreateChannelPane}
        >
          <span className="">
            <FormattedMessage defaultMessage="Add New" />
          </span>
        </SidebarItem>
      )}
    </div>
  );
};
