import { type FC, useState } from 'react';
import { lazyWithRetry } from '@boluo/utils/lazy';
import { memo, Suspense } from 'react';
import { type Banner, emptyBanner, PaneBannerContext, ThrowBanner } from '../hooks/useBanner';
import { ChannelIdContext } from '../hooks/useChannelId';
import { PaneProvider } from '../state/view.context';
import { type Pane, type PaneData } from '../state/view.types';
import { ChatPaneChannel } from './pane-channel/ChannelPane';
import { PaneError } from './pane-error/PaneError';
import { PaneSpace } from './pane-space/PaneSpace';
import { PaneEmpty } from './PaneEmpty';
import { PaneLoading } from './PaneLoading';
import { PaneWelcome } from './PaneWelcome';
import { PaneSpaceGreeting } from './PaneSpaceGreeting';
import { useSpace } from '../hooks/useSpace';

const PaneChannelSettings = lazyWithRetry(() =>
  import('./pane-channel-settings/PaneChannelSettings').then((module) => ({
    default: module.PaneChannelSettings,
  })),
);
const PaneChannelExport = lazyWithRetry(() =>
  import('./pane-channel-export/PaneChannelExport').then((module) => ({
    default: module.PaneChannelExport,
  })),
);
const PaneChannelTopic = lazyWithRetry(() =>
  import('./pane-channel-topic/PaneChannelTopic').then((module) => ({
    default: module.PaneChannelTopic,
  })),
);
const PaneSpaceSettings = lazyWithRetry(() => import('./pane-space-settings/PaneSpaceSettings'));
const PaneSpaceMembers = lazyWithRetry(() => import('./pane-space-members/PaneSpaceMembers'));
const PaneProfile = lazyWithRetry(() => import('./pane-profile/PaneProfile'));
const PaneCreateChannel = lazyWithRetry(() => import('./pane-create-channel/PaneCreateChannel'));
const PaneCreateSpace = lazyWithRetry(() => import('./PaneCreateSpace'));
const PaneSettings = lazyWithRetry(() => import('./pane-settings/PaneSettings'));
const PaneLogin = lazyWithRetry(() => import('./PaneLogin'));
const PaneSignUp = lazyWithRetry(() => import('./PaneSignUp'));
const PaneResetPassword = lazyWithRetry(() => import('./PaneResetPassword'));
const PaneHelp = lazyWithRetry(() => import('./PaneHelp'));
const PaneCharacter = lazyWithRetry(() => import('./pane-character/PaneCharacter'));

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
  SIGN_UP: PaneSignUp,
  RESET_PASSWORD: PaneResetPassword,
  PROFILE: PaneProfile,
  SPACE_MEMBERS: PaneSpaceMembers,
  CHANNEL_SETTINGS: PaneChannelSettings,
  CHANNEL_TOPIC: PaneChannelTopic,
  CHANNEL_EXPORT: PaneChannelExport,
  CHARACTER: PaneCharacter,
  EMPTY: PaneEmpty,
} satisfies Record<Pane['type'], unknown>;

const Switch: FC<Props> = ({ pane }) => {
  const spaceId = useSpace()?.id;
  switch (pane.type) {
    case 'SPACE':
      return <PaneSpace spaceId={pane.spaceId} />;
    case 'CHANNEL':
      return (
        <ChannelIdContext value={pane.channelId}>
          <ChatPaneChannel channelId={pane.channelId} spaceId={spaceId} key={pane.channelId} />
        </ChannelIdContext>
      );
    case 'CHANNEL_SETTINGS':
      return (
        <ChannelIdContext value={pane.channelId}>
          <PaneChannelSettings channelId={pane.channelId} spaceId={spaceId} key={pane.channelId} />
        </ChannelIdContext>
      );
    case 'CHANNEL_TOPIC':
      return (
        <ChannelIdContext value={pane.channelId}>
          <PaneChannelTopic channelId={pane.channelId} spaceId={spaceId} key={pane.channelId} />
        </ChannelIdContext>
      );
    case 'CHARACTER':
      return (
        <PaneCharacter
          key={pane.characterId}
          spaceId={pane.spaceId}
          characterId={pane.characterId}
        />
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
    case 'CHANNEL_EXPORT':
      return <PaneChannelExport channelId={pane.channelId} spaceId={spaceId} />;
    default: {
      const Component = PANE_MAP[pane.type] ?? PaneEmpty;
      return <Component />;
    }
  }
};

export const ChildPaneSwitch = memo(({ pane }: { pane: PaneData }) => {
  return (
    <Suspense fallback={<PaneLoading />}>
      <PaneError>
        <Switch pane={{ ...pane, key: 0 }} />
      </PaneError>
    </Suspense>
  );
});
ChildPaneSwitch.displayName = 'ChildPaneSwitch';

export const ChatPaneSwitch = memo(({ pane }: Props) => {
  const [banner, setBanner] = useState<Banner | null>(emptyBanner);
  return (
    <PaneProvider key={pane.key} paneKey={pane.key}>
      <PaneBannerContext value={banner ?? emptyBanner}>
        <ThrowBanner value={setBanner}>
          <Suspense fallback={<PaneLoading />}>
            <PaneError>
              <Switch pane={pane} />
            </PaneError>
          </Suspense>
        </ThrowBanner>
      </PaneBannerContext>
    </PaneProvider>
  );
});
ChatPaneSwitch.displayName = 'ChatPaneSwitch';
