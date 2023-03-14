import { FC, useState } from 'react';
import { memo, Suspense } from 'react';
import { Banner, emptyBanner, PaneBannerContext, ThrowBanner } from '../hooks/useBanner';
import { ChannelIdContext } from '../hooks/useChannelId';
import { PaneIdProvider } from '../state/chat-view';
import type { Pane } from '../types/chat-pane';
import { ChatPaneChannel } from './channel/ChannelPane';
import { PaneProfile } from './pane-profile/PaneProfile';
import { PaneSpaceMembers } from './pane-space-members/PaneSpaceMembers';
import { PaneCreateChannel } from './PaneCreateChannel';
import { PaneEmpty } from './PaneEmpty';
import { PaneError } from './PaneError';
import { PaneHelp } from './PaneHelp';
import { PaneLoading } from './PaneLoading';
import { PaneLogin } from './PaneLogin';
import { PaneSettings } from './settings/PaneSettings';
import { PaneSpaceSettings } from './space-settings/PaneSpaceSettings';

interface Props {
  pane: Pane;
}

const createPaneMap = <T extends Record<Pane['type'], unknown>>(map: T) => map;

const PANE_MAP = createPaneMap({
  CHANNEL: ChatPaneChannel,
  SETTINGS: PaneSettings,
  HELP: PaneHelp,
  SPACE_SETTINGS: PaneSpaceSettings,
  CREATE_CHANNEL: PaneCreateChannel,
  LOGIN: PaneLogin,
  PROFILE: PaneProfile,
  SPACE_MEMBERS: PaneSpaceMembers,
  EMPTY: PaneEmpty,
}); // satisfies Record<Pane['type'], unknown>; // https://github.com/vercel/next.js/issues/43799

const Switch: FC<Props> = ({ pane }) => {
  switch (pane.type) {
    case 'CHANNEL':
      return (
        <ChannelIdContext.Provider value={pane.channelId}>
          <ChatPaneChannel key={pane.channelId} />
        </ChannelIdContext.Provider>
      );
    case 'SPACE_SETTINGS':
      return <PaneSpaceSettings spaceId={pane.spaceId} />;
    case 'CREATE_CHANNEL':
      return <PaneCreateChannel spaceId={pane.spaceId} />;
    case 'PROFILE':
      return <PaneProfile userId={pane.userId} />;
    case 'SPACE_MEMBERS':
      return <PaneSpaceMembers spaceId={pane.spaceId} />;
    default:
      const Component = PANE_MAP[pane.type] ?? PaneEmpty;
      return <Component />;
  }
};

export const ChatPaneSwitch = memo<Props>(({ pane }) => {
  const [banner, setBanner] = useState<Banner | null>(emptyBanner);
  return (
    <PaneIdProvider key={pane.id} id={pane.id}>
      <PaneError>
        <PaneBannerContext.Provider value={banner ?? emptyBanner}>
          <ThrowBanner.Provider value={setBanner}>
            <Suspense fallback={<PaneLoading />}>
              <Switch pane={pane} />
            </Suspense>
          </ThrowBanner.Provider>
        </PaneBannerContext.Provider>
      </PaneError>
    </PaneIdProvider>
  );
});
ChatPaneSwitch.displayName = 'ChatPaneSwitch';
