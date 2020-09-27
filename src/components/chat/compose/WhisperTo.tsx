import * as React from 'react';
import { useState } from 'react';
import { ComposeDispatch, UserItem } from './reducer';
import Button from '../../atoms/Button';
import WhisperToSelect from './WhisperToSelect';

interface Props {
  whisperTo: UserItem[] | undefined | null;
  composeDispatch: ComposeDispatch;
  className?: string;
}
function WhisperTo({ whisperTo, composeDispatch, className }: Props) {
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
      {dialog && (
        <WhisperToSelect whisperTo={whisperTo} composeDispatch={composeDispatch} dismiss={() => setDialog(false)} />
      )}
    </div>
  );
}

export default WhisperTo;
