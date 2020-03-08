import React, { useRef, useState } from 'react';
import { KeyTooltip } from './KeyTooltip';
import { FileImageIcon } from '../icons';
import { checkImage } from '../../validators';

interface Props {
  file: File | null;
  setFile: (file: File) => void;
}

export const UploadButton = React.memo<Props>(({ file, setFile }) => {
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerUpload = () => {
    if (uploadRef.current) {
      uploadRef.current.click();
    }
  };

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = e => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      const result = checkImage(f);
      setError(result);
      if (result === null) {
        setFile(f);
      }
    }
  };

  let name = null;
  if (file) {
    const i = file.name.lastIndexOf('.');
    let text = i === -1 ? name : file.name.substr(0, i);
    if (text && text.length > 8) {
      text = text.substr(0, 6) + '…';
    }
    name = <span className="ml-2 text-sm">{text}</span>;
  }
  if (error) {
    name = <span className="ml-2 text-sm text-red-500">{error}</span>;
  }

  return (
    <>
      <KeyTooltip help="图片" keyHelp="">
        <button onClick={triggerUpload} className="btn">
          <FileImageIcon />
          {name}
        </button>
      </KeyTooltip>
      <input ref={uploadRef} hidden type="file" onChange={handleUpload} accept=".jpg, .jpeg, .png, .gif" />
    </>
  );
});
