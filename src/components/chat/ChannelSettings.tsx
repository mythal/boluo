import React, { useState } from 'react';
import { SettingsIcon } from '../icons';
import { cls } from '../../classname';
import { ConfirmDialog } from '../ConfirmDialog';
import { Channel, EditChannel } from '../../api/channels';
import { Input } from '../Input';
import { checkDisplayName, checkTopic } from '../../validators';
import { post } from '../../api/request';
import { errorText } from '../../api/error';

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

  const dismiss = () => setOpen(open => !open);

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
            <label>
              默认骰子类型：
              <select
                value={defaultDiceType}
                onChange={e => setDefaultDiceType(e.target.value)}
                className="text-lg p-2"
              >
                <option value="d20">D20</option>
                <option value="d100">D100</option>
                <option value="d4">D4</option>
                <option value="d6">D6</option>
                <option value="d8">D8</option>
                <option value="d10">D10</option>
              </select>
            </label>
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
});
