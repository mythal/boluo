/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { Paperclip, Refresh } from '@boluo/icons';
import { type ReactNode, memo, useState } from 'react';
import Icon from '@boluo/ui/Icon';
import { showFileSize } from '@boluo/utils';
import { getMediaUrl, supportedMediaType } from '../../media';
import { useQueryAppSettings } from '@boluo/common/hooks';

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
      <div className="bg-surface-50 border-surface-200 flex h-[6rem] flex-col justify-between rounded border px-3 py-2">
        <div className="flex items-center gap-1 font-mono text-lg">
          <Paperclip />
          {name}
        </div>
        <div className="text-surface-600 text-right">{showFileSize(size)}</div>
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
  if (
    media instanceof File &&
    (!media.type.startsWith('image/') || !supportedMediaType.includes(media.type))
  ) {
    return <Attachment name={media.name} size={media.size} className={className} />;
  }
  let content = null;
  const isLoading = loadState === 'LOADING' || isLoadingAppSettings;
  let isError = false;
  if (isLoadingAppSettings) {
    content = <Loading />;
  } else if (loadState === 'ERROR' || src === '') {
    isError = !isLoading;
    content = <LoadError onClick={() => setLoadState('LOADING')} />;
  } else {
    content = (
      <a href={src} target="_blank" className="block h-full w-fit overflow-hidden" rel="noreferrer">
        <img
          src={src}
          alt="media"
          className="block h-full rounded-sm"
          onError={() => setLoadState('ERROR')}
          onLoad={() => setLoadState('LOADED')}
        />
      </a>
    );
  }
  return (
    <div className={className}>
      <div
        className={clsx(
          'h-[6rem] rounded-sm',
          isLoading ? 'bg-surface-300 w-[6rem] animate-pulse' : '',
          isError ? 'bg-error-200 w-[6rem]' : '',
        )}
      >
        {content}
      </div>

      {children}
    </div>
  );
});

MessageMedia.displayName = 'MessageMedia';
