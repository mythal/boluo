import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import fileImage from '../../../assets/icons/file-image.svg';
import removeFileImage from '../../../assets/icons/remove-file-image.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { update } from './reducer';
import { useAtom } from 'jotai';
import { mediaAtom } from './state';

interface Props {
  className?: string;
  size?: 'normal' | 'large';
}

function ImageUploadButton({ className, size }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [media, updateMedia] = useAtom(mediaAtom);

  const removeMedia = useCallback(() => updateMedia(undefined), [updateMedia]);
  const startUpload = useCallback(() => fileInputRef.current?.click(), []);

  useEffect(() => {
    if (!media && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [media]);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      updateMedia(event.target.files[0]);
    }
  };
  return (
    <React.Fragment>
      {media ? (
        <ChatItemToolbarButton
          className={className}
          onClick={removeMedia}
          sprite={removeFileImage}
          size={size}
          title="清除图片"
        />
      ) : (
        <ChatItemToolbarButton
          className={className}
          onClick={startUpload}
          sprite={fileImage}
          size={size}
          title="上传图片"
          info="也可以拖放或粘贴"
        />
      )}
      <input type="file" ref={fileInputRef} onChange={onFileChange} hidden />
    </React.Fragment>
  );
}

export default React.memo(ImageUploadButton);
