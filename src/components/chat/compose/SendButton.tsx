import React from 'react';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import paperPlane from '../../../assets/icons/paper-plane.svg';
import save from '../../../assets/icons/save.svg';
import { isMac } from '../../../utils/browser';
import { useSelector } from '../../../store';
import { useChannelId } from '../../../hooks/useChannelId';
import { useSendPreview } from './useSendPreview';
import { whyCannotSend } from './useOnSend';

interface Props {
  onSend: () => void;
  editing?: boolean;
}

export const SendButton = ({ onSend, editing = false }: Props) => {
  const channelId = useChannelId();
  const source = useSelector((state) => state.chatStates.get(channelId)!.compose.source);
  const enterSend = useSelector((state) => state.profile!.settings.enterSend);
  const inputName = useSelector((state) => state.chatStates.get(channelId)!.compose.inputName);
  const characterName = useSelector((state) => state.profile?.channels.get(channelId)?.member.characterName ?? '');
  const inGame = useSelector((state) => state.chatStates.get(channelId)!.compose.inGame);
  const sending = useSelector((state) => state.chatStates.get(channelId)!.compose.sending);
  useSendPreview();
  let sendButtonInfo = isMac ? '⌘ + ⏎' : 'Ctrl + ⏎';
  if (enterSend) {
    sendButtonInfo = '⏎';
  }
  let name = inputName;
  if (inGame && !inputName) {
    name = characterName;
  }
  const cannotSendReason = whyCannotSend(inGame, name, source);
  sendButtonInfo = cannotSendReason || sendButtonInfo;
  return (
    <ChatItemToolbarButton
      loading={sending}
      sprite={editing ? save : paperPlane}
      onClick={onSend}
      disabled={cannotSendReason !== null}
      title={editing ? '编辑' : '发送'}
      size="large"
      info={sendButtonInfo}
      x="left"
    />
  );
};
