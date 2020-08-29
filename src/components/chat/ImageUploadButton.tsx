import * as React from 'react';
import { useCallback, useRef } from 'react';
import fileImage from '../../assets/icons/file-image.svg';
import removeFileImage from '../../assets/icons/remove-file-image.svg';
import ChatItemToolbarButton from '../atoms/ChatItemToolbarButton';
import { ComposeDispatch } from './PreviewCompose';

interface Props {
  composeDispatch: ComposeDispatch;
  hasImage: boolean;
  className?: string;
}

function ImageUploadButton({ composeDispatch, hasImage, className }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const removeMedia = useCallback(() => composeDispatch({ media: undefined }), [composeDispatch]);
  const startUpload = useCallback(() => fileInputRef.current?.click(), []);
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      composeDispatch({ media: event.target.files[0] });
    }
  };
  return (
    <React.Fragment>
      {hasImage ? (
        <ChatItemToolbarButton className={className} onClick={removeMedia} sprite={removeFileImage} title="清除图片" />
      ) : (
        <ChatItemToolbarButton className={className} onClick={startUpload} sprite={fileImage} title="上传图片" />
      )}
      <input type="file" ref={fileInputRef} onChange={onFileChange} hidden />
    </React.Fragment>
  );
}

export default React.memo(ImageUploadButton);
