import { Trash, Upload } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
  className?: string;
}

export const FileButton: FC<Props> = () => {
  const inputRef = useRef<HTMLInputElement>(null);
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
  return (
    <>
      <Button onClick={handleClick}>
        {hasMedia ? <Trash /> : <Upload />}
        <span className="@md:inline hidden">
          {hasMedia ? <FormattedMessage defaultMessage="Remove File" /> : <FormattedMessage defaultMessage="File" />}
        </span>
      </Button>
      <input type="file" ref={inputRef} className="hidden" aria-hidden hidden onChange={handleFileChange} />
    </>
  );
};
