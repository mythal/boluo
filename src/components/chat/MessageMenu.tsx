import React, { MouseEventHandler } from 'react';
import { ExpandIcon, FoldIcon, InsertIcon } from '../icons';
import { post } from '../../api/request';
import { ChannelMember } from '../../api/channels';

interface Props {
  id: string;
  folded: boolean;
  inGame: boolean;
  member: ChannelMember;
}

export const MessageMenu = React.memo<Props>(({ member, folded, id }) => {
  const toggleFold: MouseEventHandler = async e => {
    e.stopPropagation();
    await post('/messages/toggle_fold', {}, { id });
  };

  const iAmMaster = member.isMaster;
  const isMine = member.userId === id;

  return (
    <>
      <button hidden={iAmMaster || isMine} className="message-operation" onClick={toggleFold}>
        {folded ? <ExpandIcon /> : <FoldIcon />}
      </button>
      {/*<button className="message-operation"><InsertIcon/></button>*/}
    </>
  );
});
