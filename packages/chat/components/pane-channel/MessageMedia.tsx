/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { Paperclip, Refresh } from 'icons';
import { FC, ReactNode, useState } from 'react';
import Icon from 'ui/Icon';
import { showFileSize } from 'utils';
import { getMediaUrl, supportedMediaType } from '../../media';

type Props = {
  className?: string;
  mediaId?: string | null;
  mediaFile?: File | null;
  children?: ReactNode;
};

export const MessageMedia: FC<Props> = ({ mediaId, mediaFile, className, children = null }) => {
  const [loadState, setLoadState] = useState<'LOADING' | 'LOADED' | 'ERROR'>('LOADING');
  let src: string | null = null;
  if (mediaFile != null) {
    src = URL.createObjectURL(mediaFile);
  } else if (mediaId != null) {
    src = getMediaUrl(mediaId);
  } else {
    return null;
  }
  if (mediaFile && (!mediaFile.type.startsWith('image/') || !supportedMediaType.includes(mediaFile.type))) {
    return (
      <div className={className}>
        <div className="h-[6rem] py-2 px-3 bg-surface-50 rounded border border-surface-200 flex flex-col justify-between">
          <div className="flex gap-1 items-center text-lg font-mono">
            <Paperclip />
            {mediaFile.name}
          </div>
          <div className="text-surface-600 text-right">{showFileSize(mediaFile.size)}</div>
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
          loadState === 'LOADING' ? 'w-[6rem] bg-surface-300 animate-pulse' : '',
          loadState === 'ERROR' ? 'w-[6rem] bg-error-200' : '',
        )}
      >
        {loadState === 'ERROR' ? (
          <button
            className="h-full w-full flex items-center justify-center"
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
};
