import { type FC, type ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { Paperclip, Trash } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import { FormattedMessage } from 'react-intl';
import { mediaUrl } from '@boluo/api-browser';
import { showFileSize } from '@boluo/utils';
import { mediaMaxSizeByte, supportedMediaType } from '../../media';
import * as classes from '@boluo/ui/classes';

export const MediaLine: FC = () => {
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const handleRemove = () => {
    dispatch({ type: 'media', payload: { media: null } });
  };
  const composeMedia = useAtomValue(useMemo(() => selectAtom(composeAtom, ({ media }) => media), [composeAtom]));
  if (!composeMedia) return null;

  let content: ReactNode = null;
  if (composeMedia instanceof File) {
    const isTypeValid = supportedMediaType.includes(composeMedia.type);
    const isSizeValid = composeMedia.size < mediaMaxSizeByte;
    content = (
      <>
        <div data-valid={isTypeValid} className="data-[valid=false]:text-compose-media-invalid truncate">
          {composeMedia.name}
        </div>
        <div
          data-valid={isSizeValid}
          className="text-text-light data-[valid=false]:text-compose-media-invalid flex-shrink-0"
        >
          ({showFileSize(composeMedia.size)})
        </div>
      </>
    );
  } else {
    content = (
      <a href={mediaUrl(composeMedia)} target="_blank" className={classes.link}>
        <FormattedMessage defaultMessage="Link" />
      </a>
    );
  }

  return (
    <div className="flex gap-1 px-1 pt-1 text-sm">
      <Icon className="text-text-light" icon={Paperclip} />
      <div className="text-text-lighter">
        <FormattedMessage defaultMessage="Attachment" />:
      </div>
      {content}
      <button onClick={handleRemove} className="text-compose-media-remove-text hover:text-compose-media-remove-hover">
        <Icon icon={Trash} />
      </button>
    </div>
  );
};
