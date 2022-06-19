import React from 'react';
import { css } from '@emotion/core';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import cancelIcon from '../../../assets/icons/cancel.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch } from '../../../store';

interface Props {
  className?: string;
}

const style = css``;

export const Editing = ({ className }: Props) => {
  const dispatch = useDispatch();
  const pane = useChannelId();
  const cancel = () => dispatch({ type: 'CANCEL_EDIT', pane });
  return (
    <div css={style} className={className}>
      <ChatItemToolbarButton onClick={cancel} sprite={cancelIcon} title="取消编辑" />
      <span> 编辑消息中…</span>
    </div>
  );
};
