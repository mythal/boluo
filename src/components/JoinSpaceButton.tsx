import React, { useState } from 'react';
import { Dialog } from './Dialog';
import { useDispatch, useMy } from './App';
import { cls } from '../classname';
import { post } from '../api/request';
import { JoinedSpace, LeftSpace } from '../states/actions';
import { throwErr } from '../helper';
import { Space } from '../api/spaces';

interface Props {
  space: Space;
  className?: string;
}

export const JoinSpaceButton: React.FC<Props> = ({ space, className }) => {
  const [dialog, setDialog] = useState(false);
  const dispatch = useDispatch();
  const my = useMy();
  if (my === 'GUEST') {
    return null;
  }

  const joined = my.spaces.has(space.id);
  const throwE = throwErr(dispatch);

  const open = () => setDialog(true);
  const close = () => setDialog(false);

  const join = async () => {
    const id = space.id;
    const result = await post('/spaces/join', {}, { id });
    if (result.isOk) {
      dispatch<JoinedSpace>({ type: 'JOINED_SPACE', ...result.value });
    }
  };

  const leave = async () => {
    const id = space.id;
    const result = await post('/spaces/leave', {}, { id });
    if (result.isOk) {
      dispatch<LeftSpace>({ type: 'LEFT_SPACE', id });
    } else {
      throwE(result.value);
    }
    close();
  };

  const handleClick = async () => {
    if (joined) {
      open();
    } else {
      await join();
    }
  };

  return (
    <>
      <button className={cls('btn', className)} onClick={handleClick}>
        {joined ? '退出位面' : '加入位面'}
      </button>
      <Dialog open={dialog} dismiss={close} className="dialog">
        <p className="dialog-title">退出位面</p>
        <p className="my-1">要退出位面「{space?.name}」吗？</p>
        <div className="mt-4 text-right">
          <button className="btn mr-1" onClick={close}>
            取消
          </button>
          <button className="btn btn-primary" onClick={leave}>
            退出
          </button>
        </div>
      </Dialog>
    </>
  );
};
