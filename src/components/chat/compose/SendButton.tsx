import React, { useState } from 'react';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import paperPlane from '../../../assets/icons/paper-plane.svg';
import { isMac } from '../../../utils/browser';
import { useDispatch, useSelector } from '../../../store';
import { inGameAtom, inputNameAtom, isActionAtom, mediaAtom, messageIdAtom, sourceAtom, whisperToAtom } from './state';
import { showFlash } from '../../../actions/flash';
import { useChannelId } from '../../../hooks/useChannelId';
import { uploadMedia } from './helper';
import { NewMessage } from '../../../api/messages';
import { useParse } from '../../../hooks/useParse';
import { post } from '../../../api/request';
import { useAtom } from 'jotai';
import { newId } from '../../../utils/id';
import { throwErr } from '../../../utils/errors';
import { useAtomValue } from 'jotai/utils';
import { useSendPreview } from './useSendPreview';

export const SendButton = () => {
  const channelId = useChannelId();
  const [source, setSource] = useAtom(sourceAtom, channelId);

  const dispatch = useDispatch();
  const enterSend = useSelector((state) => state.profile!.settings.enterSend);
  const [messageId, setMessageId] = useAtom(messageIdAtom, channelId);
  const inputName = useAtomValue(inputNameAtom, channelId).trim();
  const inGame = useAtomValue(inGameAtom, channelId);
  const [isAction, setAction] = useAtom(isActionAtom, channelId);
  const [sending, setSending] = useState(false);
  const [media, setMedia] = useAtom(mediaAtom, channelId);
  const whisperTo = useAtomValue(whisperToAtom, channelId);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member)!;
  let name = useSelector((state) => state.profile?.user.nickname)!;
  const parse = useParse();
  useSendPreview();
  if (inGame) {
    if (inputName.length > 0) {
      name = inputName;
    } else {
      name = myMember.characterName;
    }
  }
  let sendButtonInfo = isMac ? '⌘ + ⏎' : 'Ctrl + ⏎';
  if (enterSend) {
    sendButtonInfo = '⏎';
  }
  let cannotSendReason: null | string = null;
  if (name.trim().length === 0) {
    cannotSendReason = '角色名不能为空';
  }
  if (source.trim().length === 0) {
    cannotSendReason = '内容不能为空';
  }
  const onSend = async () => {
    if (cannotSendReason !== null) {
      dispatch(showFlash('WARNING', cannotSendReason));
      return;
    }
    setSending(true);
    const mediaId = await uploadMedia(dispatch, media);
    const { text, entities } = parse(source);

    const newMessage: NewMessage = {
      messageId,
      channelId,
      mediaId,
      name,
      inGame,
      isAction,
      text,
      entities,
    };
    if (whisperTo) {
      newMessage.whisperToUsers = whisperTo.map((item) => item.value);
    }
    const resultPromise = post('/messages/send', newMessage);
    setMessageId(newId());
    const result = await resultPromise;
    setSending(false);
    if (!result.isOk) {
      throwErr(dispatch)(result.value);
      return;
    } else {
      // reset
      setAction(false);
      setSource('');
      setMedia(undefined);
    }
  };
  sendButtonInfo = cannotSendReason || sendButtonInfo;
  return (
    <ChatItemToolbarButton
      loading={sending}
      sprite={paperPlane}
      onClick={onSend}
      disabled={cannotSendReason !== null}
      title="发送"
      size="large"
      info={sendButtonInfo}
      x="left"
    />
  );
};
