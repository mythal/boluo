import * as React from 'react';
import { useCallback } from 'react';
import CommentSolid from '@boluo/icons/legacy/CommentSolid';
import Running from '@boluo/icons/legacy/Running';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  className?: string;
}

export const InPreviewActionButton = ({ className }: Props) => {
  const channelId = useChannelId();
  const dispatch = useDispatch();
  const isAction = useSelector((state) => state.chatStates.get(channelId)!.compose.isAction);
  const toggle = useCallback(() => {
    dispatch({ type: 'SET_IS_ACTION', pane: channelId, isAction: 'TOGGLE' });
  }, [channelId, dispatch]);

  return (
    <ChatItemToolbarButton
      className={className}
      onClick={toggle}
      icon={isAction ? CommentSolid : Running}
      title={isAction ? '描述发言' : '描述动作'}
      size="normal"
      info={isAction ? '从消息开头把 .me 去掉' : '在消息开头加上 .me'}
    />
  );
};
