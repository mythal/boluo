import * as React from 'react';
import { useState } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { useSelector } from '../../../store';
import Button from '../../atoms/Button';
import WhisperToSelect from './WhisperToSelect';

interface Props {
  className?: string;
}
function WhisperTo({ className }: Props) {
  const channelId = useChannelId();
  const whisperTo = useSelector((state) => state.chatStates.get(channelId)!.compose.whisperTo);
  const [dialog, setDialog] = useState(false);
  return (
    <span className={className}>
      <Button data-variant="normal" data-size="small" onClick={() => setDialog(true)}>
        {whisperTo == null || whisperTo === undefined ? (
          <span>对所有人...</span>
        ) : (
          <span>悄悄说给 ({whisperTo.length}人)...</span>
        )}
      </Button>
      {dialog && <WhisperToSelect dismiss={() => setDialog(false)} />}
    </span>
  );
}

export default WhisperTo;
