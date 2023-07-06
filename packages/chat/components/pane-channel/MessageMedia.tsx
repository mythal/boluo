/* eslint-disable @next/next/no-img-element */
import { Paperclip } from 'icons';
import { FC, ReactNode } from 'react';
import { showFileSize } from 'utils';
import { MEDIA_PUBLIC_URL } from '../../const';
import { getMediaUrl, supportedMediaType } from '../../media';

type Props = {
  className?: string;
  mediaId?: string | null;
  mediaFile?: File | null;
  children?: ReactNode;
};

export const MessageMedia: FC<Props> = ({ mediaId, mediaFile, className, children = null }) => {
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
          <div className="text-surface-600 text-right">
            {showFileSize(mediaFile.size)}
          </div>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="h-[6rem]">
        <a
          href={src}
          target="_blank"
          className="block h-full w-fit overflow-hidden"
        >
          <img
            src={src}
            alt="media"
            className="block h-full rounded-sm"
          />
        </a>
      </div>

      {children}
    </div>
  );
};
