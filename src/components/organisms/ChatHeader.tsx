import * as React from 'react';
import { css } from '@emotion/core';
import { ChannelMember } from '@/api/channels';
import { throwErr } from '@/utils/errors';
import { post } from '@/api/request';
import { Id } from '@/utils/id';
import { useState } from 'react';
import Dialog from '../molecules/Dialog';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import { useDispatch, useSelector } from '@/store';

interface Props {
  member?: ChannelMember;
}

const container = css`
  background-color: lightcoral;
  height: 3rem;
  grid-area: header;
`;

function useChannelJoinLeave(id: Id): { join: (characterName?: string) => void; leave: () => void } {
  const dispatch = useDispatch();
  const throwE = throwErr(dispatch);
  const leave = async () => {
    const result = await post('/channels/leave', {}, { id });
    if (result.isOk) {
      dispatch({ type: 'LEFT_CHANNEL', id });
    } else {
      throwE(result.value);
    }
  };
  const join = async (characterName?: string) => {
    const result = await post('/channels/join', {
      channelId: id,
      characterName,
    });
    if (result.isOk) {
      dispatch({ type: 'JOINED_CHANNEL', ...result.value });
    } else {
      throwE(result.value);
    }
  };
  return { join, leave };
}

function ChatHeader({ member }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const channelId = useSelector((state) => state.chat!.channel.id);
  const { leave, join } = useChannelJoinLeave(channelId);
  const [open, setOpen] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const onConfirm = () => {
    join(characterName);
    setOpen(false);
  };
  return (
    <div css={container}>
      {member ? <button onClick={leave}>退出频道</button> : <button onClick={() => setOpen(true)}>加入频道</button>}
      {open && (
        <Dialog title="加入频道" dismiss={() => setOpen(false)} confirm={onConfirm} mask confirmText="加入">
          <Label htmlFor="characterName">
            角色名<small>（选填）</small>
          </Label>
          <Input
            id="characterName"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="例如：甘道夫"
          />
        </Dialog>
      )}
    </div>
  );
}

export default ChatHeader;
