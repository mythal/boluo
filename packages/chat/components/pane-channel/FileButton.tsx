import { Upload } from 'icons';
import { useSetAtom } from 'jotai';
import { FC, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
  className?: string;
}

export const FileButton: FC<Props> = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
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
  return (
    <>
      <Button data-small onClick={() => inputRef.current?.click()}>
        <Upload />
        <span className="@lg:inline hidden">
          <FormattedMessage defaultMessage="File" />
        </span>
      </Button>
      <input type="file" ref={inputRef} className="hidden" aria-hidden hidden onChange={handleFileChange} />
    </>
  );
};
