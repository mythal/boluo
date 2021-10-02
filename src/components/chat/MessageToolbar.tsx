import * as React from 'react';
import { useState } from 'react';
import ItemToolbar from './ItemToolbar';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import { ChannelMember } from '../../api/channels';
import editIcon from '../../assets/icons/edit.svg';
import trashIcon from '../../assets/icons/trash.svg';
import foldIcon from '../../assets/icons/fold.svg';
import unfoldIcon from '../../assets/icons/unfold.svg';
import ChatItemToolbarButton, { ToolbarButtonProps } from './ChatItemToolbarButton';
import Dialog from '../molecules/Dialog';
import { Text } from '../atoms/Text';
import { post } from '../../api/request';
import { throwErr } from '../../utils/errors';
import { useDispatch } from '../../store';
import { css } from '@emotion/core';
import { fontMono, pL, spacingN, textSm } from '../../styles/atoms';
import { primary } from '../../styles/colors';
import { Message } from '../../api/messages';
import { useChannelId } from '../../hooks/useChannelId';
import { useAtomCallback } from 'jotai/utils';
import { editForAtom, inputNameAtom, isActionAtom, messageIdAtom, sourceAtom } from './compose/state';

interface Props {
  myMember?: ChannelMember;
  mine: boolean;
  message: Message;
}

const quoteStyle = css`
  ${[fontMono, textSm, pL(4)]};
  border-left: ${spacingN(1)} solid ${primary['700']};
`;

function MessageToolbar({ myMember, mine, message }: Props) {
  const dispatch = useDispatch();
  const channelId = useChannelId();
  const pane = useChannelId();
  const isAdmin = useIsAdmin(pane);
  const [deleteDialog, showDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const throwE = throwErr(dispatch);
  const startEdit = useAtomCallback((get, set) => {
    set(messageIdAtom, message.id);
    set(editForAtom, message.modified);
    set(isActionAtom, message.isAction);
    set(inputNameAtom, message.name);
    set(sourceAtom, message.text);
  }, channelId);
  const deleteMessage = async () => {
    setLoading(true);
    const result = await post('/messages/delete', {}, { id: message.id });
    if (!result.isOk) {
      throwE(result.value);
      setLoading(false);
    }
  };
  const toggleFold = async () => {
    setLoading(true);
    const result = await post('/messages/toggle_fold', {}, { id: message.id });
    if (!result.isOk) {
      throwE(result.value);
    }
    setLoading(false);
  };
  const buttonsProps: Array<ToolbarButtonProps> = [];
  if (isAdmin || mine) {
    buttonsProps.push({
      onClick: () => showDeleteDialog(true),
      disabled: loading,
      sprite: trashIcon,
      title: '删除',
    });
  }
  if (myMember?.isMaster) {
    if (message.folded) {
      buttonsProps.push({
        onClick: toggleFold,
        disabled: loading,
        sprite: unfoldIcon,
        title: '取消折叠',
      });
    } else {
      buttonsProps.push({
        onClick: toggleFold,
        disabled: loading,
        sprite: foldIcon,
        title: '标记折叠',
      });
    }
  }
  if (mine && message.entities.length > 0) {
    buttonsProps.push({
      onClick: startEdit,
      disabled: loading,
      sprite: editIcon,
      title: '编辑',
    });
  }

  if (buttonsProps.length === 0) {
    return null;
  }
  buttonsProps[buttonsProps.length - 1].x = 'left';
  const buttons = buttonsProps.map((props) => <ChatItemToolbarButton key={props.title} {...props} />);

  return (
    <React.Fragment>
      <ItemToolbar className="show-on-hover">{buttons}</ItemToolbar>
      {deleteDialog && (
        <Dialog
          title="删除消息"
          confirmText="删除"
          confirm={deleteMessage}
          dismiss={() => showDeleteDialog(false)}
          mask
        >
          <Text>是否要删除这条消息？</Text>
          {message.text && <Text css={quoteStyle}>{message.text}</Text>}
        </Dialog>
      )}
    </React.Fragment>
  );
}

export default React.memo(MessageToolbar);
