import { ArrowDownWideShort, Plus } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';
import React, { Suspense, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useChannelList } from '../../hooks/useQueryChannelList';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';
import Icon from '@boluo/ui/Icon';
import { SidebarChannelListSkeleton } from './SidebarChannelListSkeleton';

const SidebarChannelList = React.lazy(() => import('./SidebarChannelList'));

interface Props {
  spaceId: string;
}

export const SidebarChannels: FC<Props> = ({ spaceId }) => {
  const panes = useAtomValue(panesAtom);
  const [isReordering, setIsReordering] = useState(false);
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const { data: channelWithMemberList } = useChannelList(spaceId);
  const togglePane = usePaneToggle();
  const toggleCreateChannelPane = () => {
    togglePane({ type: 'CREATE_CHANNEL', spaceId });
  };
  const isCreateChannelPaneOpened = useMemo(
    () => panes.find((pane) => pane.type === 'CREATE_CHANNEL') !== undefined,
    [panes],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-text-light flex items-center gap-2 px-4 py-2 text-sm">
        <div className="flex-grow">
          <FormattedMessage defaultMessage="Channels" />
        </div>

        {mySpaceMember?.isAdmin && (
          <button
            aria-pressed={isReordering}
            className="text-text-lighter hover:text-text-base hover:bg-sidebar-channels-reorderButton-hover-bg aria-pressed:bg-sidebar-channels-reorderButton-active-bg aria-pressed:text-text-reverse rounded-sm px-1"
            onClick={() => setIsReordering((prev) => !prev)}
          >
            <Icon icon={ArrowDownWideShort} className="mr-1" />
            <FormattedMessage defaultMessage="Reorder" />
          </button>
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
        <SidebarItem icon={<Plus />} toggle active={isCreateChannelPaneOpened} onClick={toggleCreateChannelPane}>
          <span className="text-surface-400 group-hover:text-surface-800">
            <FormattedMessage defaultMessage="Add New" />
          </span>
        </SidebarItem>
      )}
    </div>
  );
};
