import React from 'react';
import PaperPlane from '../../../assets/icons/paper-plane.svg';
import Save from '../../../assets/icons/save.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useSelector } from '../../../store';
import { isMac } from '../../../utils/browser';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { whyCannotSend } from './useOnSend';
import { useSendPreview } from './useSendPreview';

interface Props {
  onSend: () => void;
  editing?: boolean;
}

export const SendButton = ({ onSend, editing = false }: Props) => {
  const channelId = useChannelId();
  const source = useSelector((state) => state.chatStates.get(channelId)!.compose.source);
  const enterSend = useSelector((state) => state.profile!.settings.enterSend);
  const inputName = useSelector((state) => state.chatStates.get(channelId)!.compose.inputName);
  const characterName = useSelector(
    (state) => state.profile?.channels.get(channelId)?.member.characterName ?? '',
  );
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
      icon={editing ? Save : PaperPlane}
      onClick={onSend}
      disabled={cannotSendReason !== null}
      title={editing ? '编辑' : '发送'}
      size="large"
      info={sendButtonInfo}
      x="left"
    />
  );
};
