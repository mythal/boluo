import React, { FC, useState } from 'react';
import { memo, Suspense } from 'react';
import { Banner, emptyBanner, PaneBannerContext, ThrowBanner } from '../hooks/useBanner';
import { ChannelIdContext } from '../hooks/useChannelId';
import { PaneProvider } from '../state/view.context';
import { Pane, PaneData } from '../state/view.types';
import { PaneChannelSettings } from './pane-channel-settings/PaneChannelSettings';
import { ChatPaneChannel } from './pane-channel/ChannelPane';
import { PaneError } from './pane-error/PaneError';
import { PaneSpace } from './pane-space/PaneSpace';
import { PaneEmpty } from './PaneEmpty';
import { PaneLoading } from './PaneLoading';
import { PaneWelcome } from './PaneWelcome';
import { PaneSpaceGreeting } from './PaneSpaceGreeting';

const PaneSpaceSettings = React.lazy(() => import('./pane-space-settings/PaneSpaceSettings'));
const PaneSpaceMembers = React.lazy(() => import('./pane-space-members/PaneSpaceMembers'));
const PaneProfile = React.lazy(() => import('./pane-profile/PaneProfile'));
const PaneCreateChannel = React.lazy(() => import('./PaneCreateChannel'));
const PaneCreateSpace = React.lazy(() => import('./PaneCreateSpace'));
const PaneSettings = React.lazy(() => import('./pane-settings/PaneSettings'));
const PaneLogin = React.lazy(() => import('./PaneLogin'));
const PaneHelp = React.lazy(() => import('./PaneHelp'));

interface Props {
  pane: Pane;
}

const PANE_MAP = {
  WELCOME: PaneWelcome,
  CHANNEL: ChatPaneChannel,
  SPACE: PaneSpace,
  SETTINGS: PaneSettings,
  HELP: PaneHelp,
  SPACE_SETTINGS: PaneSpaceSettings,
  SPACE_GREETING: PaneSpaceGreeting,
  CREATE_CHANNEL: PaneCreateChannel,
  CREATE_SPACE: PaneCreateSpace,
  LOGIN: PaneLogin,
  PROFILE: PaneProfile,
  SPACE_MEMBERS: PaneSpaceMembers,
  CHANNEL_SETTINGS: PaneChannelSettings,
  EMPTY: PaneEmpty,
} satisfies Record<Pane['type'], unknown>;

const Switch: FC<Props> = ({ pane }) => {
  switch (pane.type) {
    case 'SPACE':
      return <PaneSpace spaceId={pane.spaceId} />;
    case 'CHANNEL':
      return (
        <ChannelIdContext.Provider value={pane.channelId}>
          <ChatPaneChannel channelId={pane.channelId} key={pane.channelId} />
        </ChannelIdContext.Provider>
      );
    case 'CHANNEL_SETTINGS':
      return (
        <ChannelIdContext.Provider value={pane.channelId}>
          <PaneChannelSettings channelId={pane.channelId} key={pane.channelId} />
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
    case 'SPACE_GREETING':
      return <PaneSpaceGreeting spaceId={pane.spaceId} />;
    default:
      const Component = PANE_MAP[pane.type] ?? PaneEmpty;
      return <Component />;
  }
};

export const ChildPaneSwitch = memo<{ pane: PaneData }>(({ pane }) => {
  return (
    <Suspense fallback={<PaneLoading />}>
      <PaneError>
        <Switch pane={{ ...pane, key: 0 }} />
      </PaneError>
    </Suspense>
  );
});
ChildPaneSwitch.displayName = 'ChildPaneSwitch';

export const ChatPaneSwitch = memo<Props>(({ pane }) => {
  const [banner, setBanner] = useState<Banner | null>(emptyBanner);
  return (
    <PaneProvider key={pane.key} paneKey={pane.key}>
      <PaneBannerContext.Provider value={banner ?? emptyBanner}>
        <ThrowBanner.Provider value={setBanner}>
          <Suspense fallback={<PaneLoading />}>
            <PaneError>
              <Switch pane={pane} />
            </PaneError>
          </Suspense>
        </ThrowBanner.Provider>
      </PaneBannerContext.Provider>
    </PaneProvider>
  );
});
ChatPaneSwitch.displayName = 'ChatPaneSwitch';
