import { type FC, type ReactNode, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import Paperclip from '@boluo/icons/Paperclip';
import Trash from '@boluo/icons/Trash';
import Icon from '@boluo/ui/Icon';
import { FormattedMessage, useIntl } from 'react-intl';
import { mediaUrl } from '@boluo/api-browser';
import { showFileSize } from '@boluo/utils/files';
import { mediaMaxSizeByte, supportedMediaType } from '../../media';
import * as classes from '@boluo/ui/classes';
import { ButtonInline } from '@boluo/ui/ButtonInline';

export const MediaLine: FC = () => {
  const intl = useIntl();
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const removeLabel = intl.formatMessage({ defaultMessage: 'Remove attachment' });
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
    <div className="MediaLine flex gap-2 pb-1 pl-1 text-sm">
      <div className="text-text-secondary inline-flex w-18 items-center gap-1">
        <Icon icon={Paperclip} />
        <div>
          <FormattedMessage defaultMessage="Media" />
        </div>
      </div>
      {content}
      <span className="grow" />
      <ButtonInline onClick={handleRemove} aria-label={removeLabel}>
        <Icon icon={Trash} />
      </ButtonInline>
    </div>
  );
};
