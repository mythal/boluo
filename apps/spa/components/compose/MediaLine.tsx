import { type FC, type ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { Paperclip, Trash } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import { FormattedMessage } from 'react-intl';
import { mediaUrl } from '@boluo/api-browser';
import { showFileSize } from '@boluo/utils/files';
import { mediaMaxSizeByte, supportedMediaType } from '../../media';
import * as classes from '@boluo/ui/classes';

export const MediaLine: FC = () => {
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const handleRemove = () => {
    dispatch({ type: 'media', payload: { media: null } });
  };
  const composeMedia = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ media }) => media), [composeAtom]),
  );
  if (!composeMedia) return null;

  let content: ReactNode = null;
  if (composeMedia instanceof File) {
    const isTypeValid = supportedMediaType.includes(composeMedia.type);
    const isSizeValid = composeMedia.size < mediaMaxSizeByte;
    content = (
      <>
        <div
          data-valid={isTypeValid}
          className="data-[valid=false]:text-state-danger-text truncate"
        >
          {composeMedia.name}
        </div>
        <div
          data-valid={isSizeValid}
          className="text-text-secondary data-[valid=false]:text-state-danger-text shrink-0"
        >
          ({showFileSize(composeMedia.size)})
        </div>
      </>
    );
  } else {
    content = (
      <a href={mediaUrl(composeMedia)} target="_blank" className={classes.link} rel="noreferrer">
        <FormattedMessage defaultMessage="Link" />
      </a>
    );
  }

  return (
    <div className="flex gap-1 px-1 pt-1 text-sm">
      <Icon className="text-text-secondary" icon={Paperclip} />
      <div className="text-text-muted">
        <FormattedMessage defaultMessage="Attachment" />:
      </div>
      {content}
      <button
        onClick={handleRemove}
        className="text-state-danger-text hover:text-state-danger-text"
      >
        <Icon icon={Trash} />
      </button>
    </div>
  );
};
