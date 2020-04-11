import React, { useState } from 'react';
import { SettingsIcon } from '../icons';
import { ConfirmDialog } from '../ConfirmDialog';
import { Channel, EditChannel } from '../../api/channels';
import { Input } from '../Input';
import { checkDisplayName, checkTopic } from '../../validators';
import { post } from '../../api/request';
import { errorText } from '../../api/error';
import { SelectDefaultDice } from '../SelectDefaultDice';
import { cls } from '../../utils';

interface Props {
  channel: Channel;
}

export const ChannelSettings = React.memo<Props>(({ channel }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>(channel.name);
  const [topic, setTopic] = useState<string>(channel.topic);
  const [defaultDiceType, setDefaultDiceType] = useState<string>(channel.defaultDiceType);
  const [error, setError] = useState<string | null>(null);
  const nameError = checkDisplayName(name);
  const topicError = checkTopic(topic);

  const dismiss = () => setOpen((open) => !open);

  const disabled = nameError.isErr || topicError.isErr;

  const handleSetChannel = async () => {
    const payload: EditChannel = {
      channelId: channel.id,
      topic,
      name,
      defaultDiceType,
    };
    const result = await post('/channels/edit', payload);
    if (result.isErr) {
      setError(errorText(result.value));
      return;
    }
    dismiss();
  };

  return (
    <>
      <button className={cls('ml-1 btn text-xs p-1 h-8', { 'btn-down': open })} onClick={() => setOpen(true)}>
        <SettingsIcon />
      </button>
      <ConfirmDialog
        dismiss={dismiss}
        submit={handleSetChannel}
        open={open}
        confirmText="修改"
        error={error}
        disabled={disabled}
      >
        <div className="dialog-title">频道设置</div>
        <div>
          <Input value={name} onChange={setName} label="频道名" error={nameError.err()} />
          <Input value={topic} onChange={setTopic} label="当前主题" error={topicError.err()} />
          <div className="my-2">
            <SelectDefaultDice value={defaultDiceType} setValue={setDefaultDiceType} />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
});
