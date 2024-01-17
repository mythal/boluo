/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { Paperclip, Refresh } from 'icons';
import { FC, ReactNode, memo, useState } from 'react';
import Icon from 'ui/Icon';
import { showFileSize } from 'utils';
import { getMediaUrl, supportedMediaType } from '../../media';

type Props = {
  className?: string;
  media: File | string;
  children?: ReactNode;
};

export const MessageMedia = memo<Props>(({ media, className, children = null }) => {
  const [loadState, setLoadState] = useState<'LOADING' | 'LOADED' | 'ERROR'>('LOADING');
  let src: string | null = null;
  if (media instanceof File) {
    src = URL.createObjectURL(media);
  } else {
    src = getMediaUrl(media);
  }
  if (media instanceof File && (!media.type.startsWith('image/') || !supportedMediaType.includes(media.type))) {
    return (
      <div className={className}>
        <div className="bg-surface-50 border-surface-200 flex h-[6rem] flex-col justify-between rounded border px-3 py-2">
          <div className="flex items-center gap-1 font-mono text-lg">
            <Paperclip />
            {media.name}
          </div>
          <div className="text-surface-600 text-right">{showFileSize(media.size)}</div>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className={className}>
      <div
        className={clsx(
          'h-[6rem] rounded-sm',
          loadState === 'LOADING' ? 'bg-surface-300 w-[6rem] animate-pulse' : '',
          loadState === 'ERROR' ? 'bg-error-200 w-[6rem]' : '',
        )}
      >
        {loadState === 'ERROR' ? (
          <button
            className="flex h-full w-full items-center justify-center"
            type="button"
            onClick={() => setLoadState('LOADING')}
          >
            <Icon icon={Refresh} />
          </button>
        ) : (
          <a href={src} target="_blank" className="block h-full w-fit overflow-hidden">
            <img
              src={src}
              alt="media"
              className="block h-full rounded-sm"
              onError={() => setLoadState('ERROR')}
              onLoad={() => setLoadState('LOADED')}
            />
          </a>
        )}
      </div>

      {children}
    </div>
  );
});

MessageMedia.displayName = 'MessageMedia';
