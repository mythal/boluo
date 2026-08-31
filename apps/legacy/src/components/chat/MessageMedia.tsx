import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { mediaHead, mediaUrl } from '../../api/request';
import { cls } from '../../utils/classnames';
import { type Id } from '../../utils/id';
import { allowImageType } from '../../validators';
import Modal from '../atoms/Modal';

interface Props {
  className?: string;
  mediaId?: Id | null;
  file?: File;
}

const placeholderClassName = 'float-right size-12 rounded-[3px] bg-legacy-gray-700';

function MessageMedia({ className, mediaId, file }: Props) {
  const [lightBox, setLightBox] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const {
    data: headResponse,
    isLoading,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    error,
  } = useSWR(mediaId ? ['media', mediaId] : null, ([, mediaId]) => mediaHead(mediaId));
  let type: string | null = null;
  if (file) {
    type = file.type;
  } else if (headResponse?.ok) {
    type = headResponse.headers.get('content-type') || null;
  }
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      const handleLoad = () => {
        setDataUrl(reader.result as string);
      };
      reader.addEventListener('load', handleLoad, false);
      reader.readAsDataURL(file);
      return () => {
        reader.removeEventListener('load', handleLoad, false);
        reader.abort();
      };
    } else {
      // Without the reset a removed file would keep serving its stale data URL.
      // eslint-disable-next-line @eslint-react/set-state-in-effect
      setDataUrl(null);
    }
  }, [file]);

  if (!mediaId && !file) {
    return null;
  }
  if (error) {
    return (
      <div className={cls(placeholderClassName, className)}>
        <div className="flex size-full items-center justify-center text-[2rem]">×</div>
      </div>
    );
  }
  if (!type) {
    return <div className={cls(placeholderClassName, className)} />;
  }

  if (allowImageType.includes(type)) {
    const onClick: React.MouseEventHandler = (e) => {
      e.preventDefault();
      setLightBox(true);
    };
    const dismiss = () => setLightBox(false);
    let src = dataUrl;
    if (!src) {
      if (mediaId) {
        src = mediaUrl(mediaId, false);
      } else {
        return null;
      }
    }
    return (
      <React.Fragment>
        <a
          href={src}
          className={cls('float-right block size-12 hover:brightness-50', className)}
          onClick={onClick}
        >
          <img alt="消息图片" className="size-full rounded-[3px] object-cover" src={src} />
        </a>
        {lightBox && (
          <Modal mask onClickMask={dismiss}>
            <img alt="消息图片" className="max-h-[80vh] max-w-[80vw]" src={src} />
          </Modal>
        )}
      </React.Fragment>
    );
  }
  return null;
}

export default React.memo(MessageMedia);
