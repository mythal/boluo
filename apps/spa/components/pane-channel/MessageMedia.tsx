/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import Paperclip from '@boluo/icons/Paperclip';
import Refresh from '@boluo/icons/Refresh';
import {
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import Icon from '@boluo/ui/Icon';
import { showFileSize } from '@boluo/utils/files';
import { getMediaUrl, supportedMediaType } from '../../media';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { type ImagePreviewSource, useImagePreview } from './ImagePreviewOverlay';
import { useObjectUrl } from '../../hooks/useObjectUrl';

type Props = {
  className?: string;
  media: File | string;
  children?: ReactNode;
};

const Attachment = ({
  className,
  name,
  size,
  children,
}: {
  className?: string;
  name: string;
  size: number;
  children?: ReactNode;
}) => {
  return (
    <div className={className}>
      <div className="bg-surface-default border-border-default flex h-24 flex-col justify-between rounded border px-3 py-2">
        <div className="flex items-center gap-1 font-mono text-lg">
          <Paperclip />
          {name}
        </div>
        <div className="text-text-secondary text-right">{showFileSize(size)}</div>
      </div>
      {children}
    </div>
  );
};

const LoadError = ({ onClick }: { onClick?: () => void }) => {
  if (onClick == null) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Icon icon={Refresh} />
      </div>
    );
  }
  return (
    <button
      className="flex h-full w-full items-center justify-center"
      type="button"
      onClick={onClick}
    >
      <Icon icon={Refresh} />
    </button>
  );
};

const Loading = () => {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Icon icon={Refresh} />
    </div>
  );
};

type LoadState = 'LOADING' | 'LOADED' | 'ERROR';

const MediaContainer = ({
  className,
  loadState,
  mediaContent,
  children,
}: {
  className?: string;
  loadState: LoadState;
  mediaContent: ReactNode;
  children: ReactNode;
}) => (
  <div className={className}>
    <div
      className={clsx(
        'h-24 rounded-sm',
        loadState === 'LOADING' ? 'bg-surface-interactive-active w-24 animate-pulse' : '',
        loadState === 'ERROR' ? 'bg-state-danger-bg w-24' : '',
      )}
    >
      {mediaContent}
    </div>
    {children}
  </div>
);

const ResolvedImageMedia = ({
  src,
  previewSource,
  className,
  children,
}: {
  src: string;
  previewSource: ImagePreviewSource;
  className?: string;
  children: ReactNode;
}) => {
  const { open } = useImagePreview();
  const [loadState, setLoadState] = useState<LoadState>('LOADING');
  const handlePreview = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      open(previewSource);
    },
    [open, previewSource],
  );
  const content =
    loadState === 'ERROR' ? (
      <LoadError onClick={() => setLoadState('LOADING')} />
    ) : (
      <button
        type="button"
        className="block h-full w-fit cursor-zoom-in overflow-hidden"
        onClick={handlePreview}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="media"
          className="block h-full rounded-sm"
          onError={() => setLoadState('ERROR')}
          onLoad={() => setLoadState('LOADED')}
        />
      </button>
    );
  return (
    <MediaContainer className={className} loadState={loadState} mediaContent={content}>
      {children}
    </MediaContainer>
  );
};

export const MessageMedia = memo<Props>(({ media, className, children = null }: Props) => {
  const { data: appSettings, isLoading: isLoadingAppSettings } = useQueryAppSettings();
  const isLocalImage =
    media instanceof File &&
    media.type.startsWith('image/') &&
    supportedMediaType.includes(media.type);
  const objectUrl = useObjectUrl(isLocalImage ? media : null);
  const src =
    media instanceof File
      ? objectUrl
      : appSettings?.mediaUrl
        ? getMediaUrl(appSettings.mediaUrl, media)
        : null;
  const previewSource = useMemo<ImagePreviewSource | null>(() => {
    if (media instanceof File) return { type: 'BLOB', blob: media };
    if (src != null) return { type: 'URL', url: src };
    return null;
  }, [media, src]);

  if (media instanceof File && !isLocalImage) {
    return (
      <Attachment name={media.name} size={media.size} className={className}>
        {children}
      </Attachment>
    );
  }
  if (src == null || previewSource == null) {
    if (!isLoadingAppSettings && !(media instanceof File)) {
      console.error('MEDIA_URL is not set.');
    }
    const loadState = isLoadingAppSettings || media instanceof File ? 'LOADING' : 'ERROR';
    return (
      <MediaContainer
        className={className}
        loadState={loadState}
        mediaContent={loadState === 'LOADING' ? <Loading /> : <LoadError />}
      >
        {children}
      </MediaContainer>
    );
  }
  return (
    <ResolvedImageMedia key={src} src={src} previewSource={previewSource} className={className}>
      {children}
    </ResolvedImageMedia>
  );
});

MessageMedia.displayName = 'MessageMedia';
