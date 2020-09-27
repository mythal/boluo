import * as React from 'react';
import { ChannelMember } from '../../api/channels';
import { useDispatch, useSelector } from '../../store';
import { css } from '@emotion/core';
import { chatContentLineHeight } from './styles';
import { mR, textSm } from '../../styles/atoms';
import { gray } from '../../styles/colors';
import { get } from '../../api/request';
import { throwErr } from '../../utils/errors';
import { showFlash } from '../../actions/flash';
import { Message } from '../../api/messages';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import eye from '../../assets/icons/eye.svg';
import eyeSlash from '../../assets/icons/eye-slash.svg';
import { usePane } from '../../hooks/usePane';

interface Props {
  myMember?: ChannelMember;
  message: Message;
}

const whisperContentWrapper = css`
  grid-area: content;
  display: flex;
  align-items: center;
  width: 100%;
  ${[chatContentLineHeight, textSm]};
  color: ${gray['500']};

  &[data-folded='true'] {
    text-decoration: line-through;
  }
`;

function MessageWhisperList({ myMember, message }: Props) {
  const dispatch = useDispatch();
  const pane = usePane();
  const members = useSelector((state) => state.chatPane[pane]!.members);
  const { whisperToUsers } = message;

  const canAccess =
    whisperToUsers === null || (myMember && (myMember.isMaster || whisperToUsers.indexOf(myMember.userId) !== -1));
  const reveal = async () => {
    const result = await get('/messages/query', { id: message.id });
    if (result.isErr) {
      throwErr(dispatch)(result.value);
      return;
    } else if (result.value === null) {
      dispatch(showFlash('WARNING', '没有找到消息，可能已经删除'));
      return;
    }
    dispatch({ type: 'REVEAL_MESSAGE', message: result.value });
  };
  if (canAccess) {
    const canAccessMembers = members.filter((member) => whisperToUsers!.indexOf(member.user.id) !== -1);
    let description = <span>悄悄话</span>;
    if (whisperToUsers!.length > 0 && myMember?.isMaster) {
      description = (
        <span>
          对 {canAccessMembers.map((member) => member.channel.characterName || member.user.nickname).join(', ')}{' '}
          说的悄悄话
        </span>
      );
    }
    return (
      <div css={whisperContentWrapper} data-folded={message.folded}>
        <Button data-size="small" onClick={reveal} css={mR(2)}>
          查看 <Icon sprite={eye} />
        </Button>
        {description}
      </div>
    );
  } else {
    return (
      <div css={whisperContentWrapper} data-folded={message.folded}>
        <span>
          <Icon sprite={eyeSlash} css={mR(2)} />
          对别的人说悄悄话
        </span>
      </div>
    );
  }
}

export default MessageWhisperList;
