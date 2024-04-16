/* eslint-disable @next/next/no-img-element */
import { Paperclip } from '@boluo/icons';
import { FC, memo } from 'react';
import { showFileSize } from '@boluo/utils';
import { getMediaUrl, supportedMediaType } from '../../media';

const FileMedia: FC<{ file: File; className?: string }> = ({ file, className }) => (
  <div className={className}>
    <div className="grid grid-cols-[auto_1fr] grid-rows-2 items-center gap-x-1 px-1">
      <div className="">
        <Paperclip />
      </div>

      <div className="">File</div>
      <div className="text-text-lighter col-span-full text-xs">{showFileSize(file.size)}</div>
    </div>
  </div>
);

type Props = {
  className?: string;
  media: File | string;
};

export const ComposeMedia = memo<Props>(({ media, className }) => {
  let src: string | null = null;
  if (media instanceof File) {
    src = URL.createObjectURL(media);
  } else {
    src = getMediaUrl(media);
  }
  if (media instanceof File && (!media.type.startsWith('image/') || !supportedMediaType.includes(media.type))) {
    return <FileMedia file={media} className={className} />;
  }
  return (
    <div className={className}>
      <div className="max-h-[7rem] max-w-[4rem] overflow-hidden rounded-sm border shadow-sm">
        <img src={src} alt="media" className="block h-full rounded-sm" />
      </div>
    </div>
  );
});

ComposeMedia.displayName = 'ComposeMedia';
