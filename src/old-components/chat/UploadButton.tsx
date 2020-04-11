import React, { useRef } from 'react';
import { KeyTooltip } from './KeyTooltip';
import { CancelIcon, FileImageIcon } from '../icons';
import { checkImage } from '../../validators';

interface Props {
  file: File | null;
  setFile: (file: File | null) => void;
  setError: (error: string | null) => void;
}

export const UploadButton = React.memo<Props>(({ file, setFile, setError }) => {
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const triggerUpload = () => {
    if (uploadRef.current) {
      uploadRef.current.click();
    }
  };

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      const result = checkImage(f);
      setError(result.err());
      if (result.isOk) {
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

  const cancelFile = () => {
    setFile(null);
    if (uploadRef.current) {
      uploadRef.current.value = '';
    }
  };

  return (
    <>
      <KeyTooltip help="图片" keyHelp="">
        <button onClick={triggerUpload} className="btn">
          <FileImageIcon />
          {name}
        </button>
      </KeyTooltip>
      {file && (
        <button className="btn" onClick={cancelFile}>
          <CancelIcon />
        </button>
      )}
      <input ref={uploadRef} hidden type="file" onChange={handleUpload} accept=".jpg, .jpeg, .png, .gif" />
    </>
  );
});
