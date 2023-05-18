import { css } from '@emotion/react';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { mediaHead, mediaUrl } from '../../api/request';
import { roundedSm } from '../../styles/atoms';
import { gray } from '../../styles/colors';
import { Id } from '../../utils/id';
import { allowImageType } from '../../validators';
import Modal from '../atoms/Modal';

interface Props {
  className?: string;
  mediaId?: Id | null;
  file?: File;
}

export const inlineImg = css`
  ${roundedSm};
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const placeHolder = css`
  float: right;
  width: 3rem;
  height: 3rem;
  ${roundedSm};
  background-color: ${gray['700']};
`;

export const largeImg = css`
  max-width: 80vw;
  max-height: 80vh;
`;

export const inlineImgLink = css`
  display: block;
  float: right;
  width: 3rem;
  height: 3rem;
  &:hover {
    filter: brightness(50%);
  }
`;

function MessageMedia({ className, mediaId, file }: Props) {
  const [lightBox, setLightBox] = useState(false);
  const [type, setType] = useState<string | undefined | null>(file?.type);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mediaId || !mounted.current) {
      return;
    }
    (async () => {
      const response = await mediaHead(mediaId);
      if (response.ok && mounted.current) {
        setType(response.headers.get('content-type'));
      }
    })();
  }, [mediaId]);

  useEffect(() => {
    if (file) {
      setType(file.type);
      const reader = new FileReader();
      reader.addEventListener(
        'load',
        function() {
          setDataUrl(reader.result as string);
        },
        false,
      );
      reader.readAsDataURL(file);
    } else {
      setDataUrl(null);
    }
  }, [file]);

  if (!mediaId && !file) {
    return null;
  }
  if (!type) {
    return <div css={placeHolder} className={className} />;
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
        <a href={src} css={inlineImgLink} className={className} onClick={onClick}>
          <img alt="" css={inlineImg} src={src} />
        </a>
        {lightBox && (
          <Modal mask onClickMask={dismiss}>
            <img alt="" css={largeImg} src={src} />
          </Modal>
        )}
      </React.Fragment>
    );
  }
  return null;
}

export default React.memo(MessageMedia);
