import React, { MouseEventHandler, useRef, useState } from 'react';
import { EllipsisIcon, ExpandIcon, FoldIcon, InsertIcon, SignOutIcon } from '../icons';
import { cls } from '../../classname';
import { useOutside } from '../../hooks';
import { post } from '../../api/request';
import { useDispatch } from '../App';
import { MessageEdited } from '../../api/events';

interface Props {
  id: string;
  folded: boolean;
  inGame: boolean;
}

export const MessageMenu = React.memo<Props>(({ inGame, folded, id }) => {
  const dispatch = useDispatch();

  const toggleFold: MouseEventHandler = async e => {
    e.stopPropagation();
    await post('/messages/toggle_fold', {}, { id });
  };

  return (
    <>
      <button className="message-operation" onClick={toggleFold}>
        {folded ? <ExpandIcon /> : <FoldIcon />}
      </button>
      {/*<button className="message-operation"><InsertIcon/></button>*/}
    </>
  );
});
