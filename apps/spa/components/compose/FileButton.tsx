import { Trash, Upload } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { InComposeButton } from './InComposeButton';

interface Props {
  className?: string;
}

export const FileButton: FC<Props> = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const intl = useIntl();
  const { composeAtom, hasMediaAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const hasMedia = useAtomValue(hasMediaAtom);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0]!;
    dispatch({ type: 'media', payload: { media: file } });
    // reset file input
    event.target.value = '';
  };
  const handleClick = () => {
    if (hasMedia) {
      dispatch({ type: 'media', payload: { media: null } });
    } else {
      inputRef.current?.click();
    }
  };
  const title = hasMedia
    ? intl.formatMessage({ defaultMessage: 'Remove File' })
    : intl.formatMessage({ defaultMessage: 'Add File' });
  return (
    <>
      <InComposeButton onClick={handleClick} title={title}>
        {hasMedia ? <Trash /> : <Upload />}
      </InComposeButton>
      <input type="file" ref={inputRef} className="hidden" aria-hidden hidden onChange={handleFileChange} />
    </>
  );
};
