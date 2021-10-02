import { useUpdateAtom } from 'jotai/utils';
import { isActionAtom } from './state';
import * as React from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import actionIcon from '../../../assets/icons/running.svg';
import sayIcon from '../../../assets/icons/comment-solid.svg';
import { useCallback } from 'react';
import { useAtom } from 'jotai';

interface Props {
  className?: string;
}

export const InPreviewActionButton = ({ className }: Props) => {
  const channelId = useChannelId();
  const [isAction, setAction] = useAtom(isActionAtom, channelId);
  const toggle = useCallback(() => setAction('toggle'), [setAction]);

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
