import * as React from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import actionIcon from '../../../assets/icons/running.svg';
import sayIcon from '../../../assets/icons/comment-solid.svg';
import { useCallback } from 'react';
import { useDispatch, useSelector } from '../../../store';

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
      sprite={isAction ? sayIcon : actionIcon}
      title={isAction ? '描述发言' : '描述动作'}
      size="normal"
      info={isAction ? '从消息开头把 .me 去掉' : '在消息开头加上 .me'}
    />
  );
};
