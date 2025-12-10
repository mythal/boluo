import { css } from '@emotion/react';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { type ChannelMember } from '../../api/channels';
import { type Message } from '../../api/messages';
import { post } from '../../api/request';
import Edit from '../../assets/icons/edit.svg';
import Fold from '../../assets/icons/fold.svg';
import Trash from '../../assets/icons/trash.svg';
import Unfold from '../../assets/icons/unfold.svg';
import { useChannelId } from '../../hooks/useChannelId';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import store, { useDispatch } from '../../store';
import { fontMono, pL, spacingN, textSm } from '../../styles/atoms';
import { primary } from '../../styles/colors';
import { throwErr } from '../../utils/errors';
import { Text } from '../atoms/Text';
import Dialog from '../molecules/Dialog';
import ChatItemToolbarButton, { type ToolbarButtonProps } from './ChatItemToolbarButton';
import ItemToolbar from './ItemToolbar';

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
  const startEdit = useCallback(() => {
    dispatch({ type: 'START_EDIT_MESSAGE', pane: channelId, message });
  }, [channelId, dispatch, message]);
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
      icon: Trash,
      title: '删除',
    });
  }
  if (myMember?.isMaster) {
    if (message.folded) {
      buttonsProps.push({
        onClick: toggleFold,
        disabled: loading,
        icon: Unfold,
        title: '取消折叠',
      });
    } else {
      buttonsProps.push({
        onClick: toggleFold,
        disabled: loading,
        icon: Fold,
        title: '标记折叠',
      });
    }
  }
  if (mine && message.entities.length > 0) {
    buttonsProps.push({
      onClick: startEdit,
      disabled: loading,
      icon: Edit,
      title: '编辑',
    });
  }

  if (buttonsProps.length === 0) {
    return null;
  }
  buttonsProps[buttonsProps.length - 1].x = 'left';
  const buttons = buttonsProps.map((props) => (
    <ChatItemToolbarButton key={props.title} {...props} />
  ));

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
