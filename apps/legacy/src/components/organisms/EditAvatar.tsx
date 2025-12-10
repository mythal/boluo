import { css } from '@emotion/react';
import * as React from 'react';
import { useRef, useState } from 'react';
import { mediaUrl } from '../../api/request';
import { type Id } from '../../utils/id';
import Avatar from '../molecules/Avatar';

interface Props {
  mediaId: Id | null;
  selectFile: (file: File) => void;
  size: string;
  className?: string;
}

const MAX_SIZE = 1024 * 1024;

const avatarStyle = css`
  cursor: pointer;

  &:hover {
    filter: brightness(65%);
  }
`;

function EditAvatar({ className, mediaId, selectFile, size }: Props) {
  const input = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const onClick = () => {
    if (input.current) {
      input.current.click();
    }
  };

  const onFileSelected = () => {
    if (!input.current || input.current.files == null || input.current.files.length === 0) {
      return;
    }
    const file: File = input.current.files[0];
    if (file.size > MAX_SIZE) {
      alert('图片最大不能超过 1MiB');
    } else {
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      selectFile(file);
    }
  };

  const uri = previewUrl || (mediaId ? mediaUrl(mediaId) : undefined);

  return (
    <>
      <input
        id="inputAvatar"
        accept="image/gif,image/png,image/jpeg"
        type="file"
        onChange={onFileSelected}
        ref={input}
        hidden
      />
      <Avatar
        id={null}
        src={uri}
        size={size}
        onClick={onClick}
        css={avatarStyle}
        className={className}
      />
    </>
  );
}

export default EditAvatar;
