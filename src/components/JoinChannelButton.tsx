import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { useDispatch, useMy } from './App';
import { cls } from '../classname';
import { Channel } from '../api/channels';
import { post } from '../api/request';
import { JoinedChannel, LeftChannel } from '../states/actions';
import { throwErr } from '../helper';
import { Input } from './Input';
import { checkCharacterName } from '../validators';

interface Props {
  channel: Channel;
  className?: string;
}

export const JoinChannelButton: React.FC<Props> = ({ channel, className }) => {
  const [dialog, setDialog] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const dispatch = useDispatch();
  const my = useMy();
  if (my === 'GUEST') {
    return null;
  }
  const nameError = characterName.length > 0 ? checkCharacterName(characterName) : null;
  const id = channel.id;
  const joined = my.channels.has(id);
  const throwE = throwErr(dispatch);

  const open = () => setDialog(true);
  const close = () => setDialog(false);

  const join = async () => {
    const result = await post('/channels/join', {
      channelId: id,
      characterName,
    });
    if (result.isOk) {
      dispatch<JoinedChannel>({ type: 'JOINED_CHANNEL', ...result.value });
    } else {
      throwE(result.value);
    }
    close();
  };

  const leave = async () => {
    const result = await post('/channels/leave', {}, { id });
    if (result.isOk) {
      dispatch<LeftChannel>({ type: 'LEFT_CHANNEL', id });
    } else {
      throwE(result.value);
    }
    close();
  };

  if (joined) {
    return (
      <>
        <button className={cls('btn', className)} onClick={open}>
          退出频道
        </button>
        <Dialog open={dialog} dismiss={close} className="dialog">
          <p className="dialog-title">退出频道</p>
          <p className="my-1">要退出频道「{channel.name}」吗？</p>
          <div className="mt-4 text-right">
            <button className="btn mr-1" onClick={close}>
              取消
            </button>
            <button className="btn btn-primary" onClick={leave}>
              退出频道
            </button>
          </div>
        </Dialog>
      </>
    );
  }
  return (
    <>
      <button className={cls('btn', className)} onClick={open}>
        加入频道
      </button>
      <Dialog open={dialog} dismiss={close} className="dialog">
        <p className="dialog-title">加入频道</p>
        <p className="my-1">要加入频道「{channel.name}」吗？</p>
        <Input label="角色名" value={characterName} onChange={setCharacterName} error={nameError?.err()} />
        <p className="text-xs">（选填）你在这个频道担当的角色的称呼。</p>
        <div className="mt-4 text-right">
          <button className="btn mr-1" onClick={close}>
            取消
          </button>
          <button className="btn btn-primary" autoFocus onClick={join} disabled={Boolean(nameError?.isErr)}>
            加入频道
          </button>
        </div>
      </Dialog>
    </>
  );
};
