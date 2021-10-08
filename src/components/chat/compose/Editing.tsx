import React, { useCallback } from 'react';
import { css } from '@emotion/core';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import cancelIcon from '../../../assets/icons/cancel.svg';
import { useAtomCallback } from 'jotai/utils';
import { useChannelId } from '../../../hooks/useChannelId';
import { editForAtom, inputNameAtom, mediaAtom, messageIdAtom, sourceAtom, whisperToAtom } from './state';
import { newId } from '../../../utils/id';

interface Props {
  className?: string;
}

const style = css``;

export const useResetEdit = () => {
  const channelId = useChannelId();
  return useAtomCallback(
    useCallback((get, set) => {
      console.log('reset');
      set(editForAtom, null);
      set(messageIdAtom, newId());
      set(sourceAtom, '');
      set(whisperToAtom, null);
      set(mediaAtom, undefined);
      set(inputNameAtom, '');
    }, []),
    channelId
  );
};

export const Editing = ({ className }: Props) => {
  const cancel = useResetEdit();
  return (
    <div css={style} className={className}>
      <ChatItemToolbarButton onClick={cancel} sprite={cancelIcon} title="取消编辑" />
      <span> 编辑消息中…</span>
    </div>
  );
};
