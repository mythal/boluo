import type { FC } from 'react';
import { memo, Suspense } from 'react';
import { ChannelIdContext } from '../../hooks/useChannelId';
import { PaneIdProvider } from '../../state/panes';
import type { Pane } from '../../types/ChatPane';
import { ChatPaneChannel } from './channel/ChannelPane';
import { PaneCreateChannel } from './PaneCreateChannel';
import { PaneEmpty } from './PaneEmpty';
import { PaneError } from './PaneError';
import { PaneHelp } from './PaneHelp';
import { PaneLoading } from './PaneLoading';
import { PaneSettings } from './settings/PaneSettings';
import { PaneSpaceSettings } from './space-settings/PaneSpaceSettings';

interface Props {
  pane: Pane;
}

const Switch: FC<Props> = ({ pane }) => {
  switch (pane.type) {
    case 'CHANNEL':
      return (
        <ChannelIdContext.Provider value={pane.channelId}>
          <ChatPaneChannel key={pane.channelId} />
        </ChannelIdContext.Provider>
      );
    case 'SETTINGS':
      return <PaneSettings />;
    case 'HELP':
      return <PaneHelp />;
    case 'SPACE_SETTINGS':
      return <PaneSpaceSettings spaceId={pane.spaceId} />;
    case 'CREATE_CHANNEL':
      return <PaneCreateChannel spaceId={pane.spaceId} />;
    default:
      return <PaneEmpty />;
  }
};

export const ChatPaneSwitch = memo<Props>(({ pane }) => {
  return (
    <PaneIdProvider key={pane.id} id={pane.id}>
      <PaneError>
        <Suspense fallback={<PaneLoading />}>
          <Switch pane={pane} />
        </Suspense>
      </PaneError>
    </PaneIdProvider>
  );
});
ChatPaneSwitch.displayName = 'ChatPaneSwitch';
