import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import FileImage from '../../../assets/icons/file-image.svg';
import RemoveFileImage from '../../../assets/icons/remove-file-image.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  className?: string;
  size?: 'normal' | 'large';
}

function ImageUploadButton({ className, size }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const channelId = useChannelId();
  const dispatch = useDispatch();
  const media = useSelector((state) => state.chatStates.get(channelId)!.compose.media);

  const removeMedia = useCallback(
    () => dispatch({ type: 'SET_COMPOSE_MEDIA', pane: channelId }),
    [channelId, dispatch],
  );
  const startUpload = useCallback(() => fileInputRef.current?.click(), []);

  useEffect(() => {
    if (!media && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [media]);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files && event.target.files.length > 0) {
      dispatch({ type: 'SET_COMPOSE_MEDIA', pane: channelId, media: event.target.files[0] });
    }
  };
  return (
    <React.Fragment>
      {media ? (
        <ChatItemToolbarButton
          className={className}
          onClick={removeMedia}
          icon={RemoveFileImage}
          size={size}
          title="清除图片"
        />
      ) : (
        <ChatItemToolbarButton
          className={className}
          onClick={startUpload}
          icon={FileImage}
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
