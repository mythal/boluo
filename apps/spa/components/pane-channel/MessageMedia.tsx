/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { Paperclip, Refresh } from '@boluo/icons';
import {
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  memo,
  useCallback,
  useState,
} from 'react';
import Icon from '@boluo/ui/Icon';
import { showFileSize } from '@boluo/utils/files';
import { getMediaUrl, supportedMediaType } from '../../media';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useImagePreview } from './ImagePreviewOverlay';

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

const LoadError = ({ onClick }: { onClick: () => void }) => {
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

export const MessageMedia = memo<Props>(({ media, className, children = null }: Props) => {
  const { data: appSettings, isLoading: isLoadingAppSettings } = useQueryAppSettings();
  const { open } = useImagePreview();
  const mediaUrl = appSettings?.mediaUrl;
  const [loadState, setLoadState] = useState<'LOADING' | 'LOADED' | 'ERROR'>('LOADING');
  let src: string | null = null;
  if (media instanceof File) {
    src = URL.createObjectURL(media);
  } else if (mediaUrl) {
    src = getMediaUrl(mediaUrl, media);
  } else if (isLoadingAppSettings) {
    src = '';
  } else {
    console.error('MEDIA_URL is not set.');
    src = '';
  }
  let content = null;
  const isLoading = loadState === 'LOADING' || isLoadingAppSettings;
  let isError = false;
  const handlePreview = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!src || isLoadingAppSettings) return;
      open(src);
    },
    [isLoadingAppSettings, open, src],
  );
  if (
    media instanceof File &&
    (!media.type.startsWith('image/') || !supportedMediaType.includes(media.type))
  ) {
    return <Attachment name={media.name} size={media.size} className={className} />;
  }
  if (isLoadingAppSettings) {
    content = <Loading />;
  } else if (loadState === 'ERROR' || src === '') {
    isError = !isLoading;
    content = <LoadError onClick={() => setLoadState('LOADING')} />;
  } else {
    content = (
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
  }
  return (
    <div className={className}>
      <div
        className={clsx(
          'h-24 rounded-sm',
          isLoading ? 'bg-surface-interactive-active w-24 animate-pulse' : '',
          isError ? 'bg-state-danger-bg w-24' : '',
        )}
      >
        {content}
      </div>

      {children}
    </div>
  );
});

MessageMedia.displayName = 'MessageMedia';
