/* eslint-disable @next/next/no-img-element */
import type { EntryComponentMatch } from '@boluo/api';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useQueryAsset } from '@boluo/hooks/useQueryAsset';
import HatGlasses from '@boluo/icons/HatGlasses';
import Refresh from '@boluo/icons/Refresh';
import { Button } from '@boluo/ui/Button';
import { Spinner } from '@boluo/ui/Spinner';
import { getMediaUrl } from '@boluo/utils/media';
import clsx from 'clsx';
import { type FC, type ReactNode, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { parsePortraitComponent } from './portrait';

export type CharacterPortraitSource =
  | { type: 'NONE' }
  | { type: 'LOADING' }
  | { type: 'ERROR' }
  | { type: 'ASSET'; assetId: string }
  | { type: 'PREVIEW'; url: string; busy: boolean };

interface Props {
  spaceId: string;
  characterName: string;
  source: CharacterPortraitSource;
  size?: 'main' | 'gallery' | 'card' | 'popover';
  loading?: 'eager' | 'lazy';
}

export const characterPortraitSizeClassName = {
  main: 'w-[clamp(9rem,36cqw,15rem)]',
  gallery: 'w-[clamp(7rem,27cqw,11rem)]',
  card: 'w-20',
  popover: 'w-18',
} as const satisfies Record<NonNullable<Props['size']>, string>;

export const portraitSourceFromEntry = (entry: EntryComponentMatch): CharacterPortraitSource => {
  const portrait = parsePortraitComponent(entry.component);
  return portrait == null ? { type: 'ERROR' } : { type: 'ASSET', assetId: portrait.assetId };
};

const PortraitFrame: FC<{ children: ReactNode; size: NonNullable<Props['size']> }> = ({
  children,
  size,
}) => (
  <div
    className={clsx(
      'bg-surface-default border-border-default relative aspect-3/4 shrink-0 overflow-hidden rounded-md border',
      characterPortraitSizeClassName[size],
    )}
  >
    {children}
  </div>
);

const LoadingOverlay: FC = () => (
  <div className="bg-surface-default/70 absolute inset-0 flex items-center justify-center">
    <Spinner />
    <span className="sr-only">
      <FormattedMessage defaultMessage="Loading portrait" />
    </span>
  </div>
);

const PortraitFallback: FC<{
  failed: boolean;
  compact: boolean;
  onRetry?: () => void;
}> = ({ failed, compact, onRetry }) => (
  <div className="text-text-muted flex h-full w-full flex-col items-center justify-center gap-2 p-2 text-center text-xs">
    <HatGlasses className="h-8 w-8" />
    <span className={clsx(compact && 'sr-only')}>
      {failed ? (
        <FormattedMessage defaultMessage="Portrait could not be loaded." />
      ) : (
        <FormattedMessage defaultMessage="No portrait" />
      )}
    </span>
    {onRetry != null && (
      <Button
        small
        onClick={onRetry}
        className={clsx('px-2', compact && 'absolute inset-0 border-0 bg-transparent')}
      >
        <Refresh />
        <span className={clsx(compact && 'sr-only')}>
          <FormattedMessage defaultMessage="Retry" />
        </span>
      </Button>
    )}
  </div>
);

type ImageLoadState = 'LOADING' | 'LOADED' | 'ERROR';

const ResolvedPortraitImage: FC<{
  url: string;
  alt: string;
  busy: boolean;
  compact: boolean;
  loading: NonNullable<Props['loading']>;
}> = ({ url, alt, busy, compact, loading }) => {
  const [loadState, setLoadState] = useState<ImageLoadState>('LOADING');

  if (loadState === 'ERROR') {
    return <PortraitFallback failed compact={compact} onRetry={() => setLoadState('LOADING')} />;
  }

  return (
    <>
      <img
        src={url}
        alt={alt}
        loading={loading}
        className="h-full w-full object-cover"
        onLoad={() => setLoadState('LOADED')}
        onError={() => setLoadState('ERROR')}
      />
      {(busy || loadState === 'LOADING') && <LoadingOverlay />}
    </>
  );
};

const AssetPortrait: FC<{
  spaceId: string;
  assetId: string;
  alt: string;
  size: NonNullable<Props['size']>;
  loading: NonNullable<Props['loading']>;
}> = ({ spaceId, assetId, alt, size, loading }) => {
  const {
    data: appSettings,
    error: settingsError,
    isLoading: settingsLoading,
  } = useQueryAppSettings();
  const {
    data: asset,
    error: assetError,
    isLoading: assetLoading,
  } = useQueryAsset(spaceId, assetId);

  if (assetLoading || settingsLoading) {
    return (
      <PortraitFrame size={size}>
        <PortraitFallback failed={false} compact={size !== 'main'} />
        <LoadingOverlay />
      </PortraitFrame>
    );
  }
  if (assetError != null || settingsError != null || asset == null || !appSettings?.mediaUrl) {
    return (
      <PortraitFrame size={size}>
        <PortraitFallback failed compact={size !== 'main'} />
      </PortraitFrame>
    );
  }

  const imageUrl = getMediaUrl(appSettings.mediaUrl, asset.mediaId);
  return (
    <PortraitFrame size={size}>
      <ResolvedPortraitImage
        key={imageUrl}
        url={imageUrl}
        alt={alt}
        busy={false}
        compact={size !== 'main'}
        loading={loading}
      />
    </PortraitFrame>
  );
};

export const CharacterPortrait: FC<Props> = ({
  spaceId,
  characterName,
  source,
  size = 'main',
  loading = 'eager',
}) => {
  const intl = useIntl();
  const alt = intl.formatMessage(
    { defaultMessage: 'Portrait of {characterName}' },
    { characterName },
  );

  switch (source.type) {
    case 'NONE':
      return (
        <PortraitFrame size={size}>
          <PortraitFallback failed={false} compact={size !== 'main'} />
        </PortraitFrame>
      );
    case 'LOADING':
      return (
        <PortraitFrame size={size}>
          <PortraitFallback failed={false} compact={size !== 'main'} />
          <LoadingOverlay />
        </PortraitFrame>
      );
    case 'ERROR':
      return (
        <PortraitFrame size={size}>
          <PortraitFallback failed compact={size !== 'main'} />
        </PortraitFrame>
      );
    case 'PREVIEW':
      return (
        <PortraitFrame size={size}>
          <ResolvedPortraitImage
            key={source.url}
            url={source.url}
            alt={alt}
            busy={source.busy}
            compact={size !== 'main'}
            loading={loading}
          />
        </PortraitFrame>
      );
    case 'ASSET':
      return (
        <AssetPortrait
          spaceId={spaceId}
          assetId={source.assetId}
          alt={alt}
          size={size}
          loading={loading}
        />
      );
  }
};
