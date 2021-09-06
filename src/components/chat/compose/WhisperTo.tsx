import * as React from 'react';
import { useState } from 'react';
import Button from '../../atoms/Button';
import WhisperToSelect from './WhisperToSelect';
import { whisperToAtom } from './state';
import { useAtomValue } from 'jotai/utils';

interface Props {
  className?: string;
}
function WhisperTo({ className }: Props) {
  const whisperTo = useAtomValue(whisperToAtom);
  const [dialog, setDialog] = useState(false);
  return (
    <div className={className}>
      <Button data-variant="normal" data-size="small" onClick={() => setDialog(true)}>
        {whisperTo === null || whisperTo === undefined ? (
          <span>悄悄话（关）...</span>
        ) : (
          <span>悄悄说给 ({whisperTo.length}人)...</span>
        )}
      </Button>
      {dialog && <WhisperToSelect dismiss={() => setDialog(false)} />}
    </div>
  );
}

export default WhisperTo;
