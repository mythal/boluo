import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import fileImage from '../../../assets/icons/file-image.svg';
import removeFileImage from '../../../assets/icons/remove-file-image.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { ComposeDispatch, update } from './reducer';

interface Props {
  composeDispatch: ComposeDispatch;
  hasImage: boolean;
  className?: string;
  size?: 'normal' | 'large';
}

function ImageUploadButton({ composeDispatch, hasImage, className, size }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const removeMedia = useCallback(() => composeDispatch(update({ media: undefined })), [composeDispatch]);
  const startUpload = useCallback(() => fileInputRef.current?.click(), []);

  useEffect(() => {
    if (!hasImage && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [hasImage]);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      composeDispatch(update({ media: event.target.files[0] }));
    }
  };
  return (
    <React.Fragment>
      {hasImage ? (
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
        />
      )}
      <input type="file" ref={fileInputRef} onChange={onFileChange} hidden />
    </React.Fragment>
  );
}

export default React.memo(ImageUploadButton);
