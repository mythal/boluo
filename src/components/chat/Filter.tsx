import * as React from 'react';
import { useRef, useState } from 'react';
import Icon from '../atoms/Icon';
import filterIcon from '../../assets/icons/filter.svg';
import circle from '../../assets/icons/circle.svg';
import dotCircle from '../../assets/icons/dot-circle.svg';
import ChatHeaderButton from '../atoms/ChatHeaderButton';
import Overlay from '../atoms/Overlay';
import Menu from '../atoms/Menu';
import { MenuItem } from '../atoms/MenuItem';
import { useDispatch, useSelector } from '../../store';
import { chatInGameFilter, chatNoneFilter, chatOutGameFilter } from '../../actions/chat';
import { usePane } from '../../hooks/usePane';

interface Props {
  className?: string;
}

function Filter({ className }: Props) {
  const pane = usePane();
  const filter = useSelector((state) => state.chatPane[pane]!.filter);
  const button = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const dismiss = () => setOpen(false);
  return (
    <React.Fragment>
      <ChatHeaderButton onClick={() => setOpen((open) => !open)} ref={button} className={className}>
        <Icon sprite={filterIcon} />
      </ChatHeaderButton>
      {open && (
        <Overlay x={1} y={1} selfX={-1} anchor={button} onOuter={dismiss}>
          <Menu dismiss={dismiss}>
            <MenuItem onClick={() => dispatch(chatInGameFilter(pane))} icon={filter === 'IN_GAME' ? dotCircle : circle}>
              游戏内消息
            </MenuItem>
            <MenuItem
              onClick={() => dispatch(chatOutGameFilter(pane))}
              icon={filter === 'OUT_GAME' ? dotCircle : circle}
            >
              游戏外消息
            </MenuItem>
            <MenuItem onClick={() => dispatch(chatNoneFilter(pane))} icon={filter === 'NONE' ? dotCircle : circle}>
              所有消息
            </MenuItem>
          </Menu>
        </Overlay>
      )}
    </React.Fragment>
  );
}

export default Filter;
