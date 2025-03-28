import * as React from 'react';
import { useRef, useState } from 'react';
import { chatInGameFilter, chatNoneFilter, chatOutGameFilter } from '../../actions';
import check from '../../assets/icons/check.svg';
import circle from '../../assets/icons/circle.svg';
import dotCircle from '../../assets/icons/dot-circle.svg';
import filterIcon from '../../assets/icons/filter.svg';
import uncheck from '../../assets/icons/uncheck.svg';
import { useChannelId } from '../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../store';
import Icon from '../atoms/Icon';
import Menu from '../atoms/Menu';
import { MenuItem } from '../atoms/MenuItem';
import Overlay from '../atoms/Overlay';
import ChatHeaderButton from './ChatHeaderButton';

interface Props {
  className?: string;
}

function Filter({ className }: Props) {
  const pane = useChannelId()!;
  const filter = useSelector((state) => state.chatStates.get(pane)!.filter);
  const showFolded = useSelector((state) => state.chatStates.get(pane)!.showFolded);
  const button = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const dismiss = () => setOpen(false);
  return (
    <React.Fragment>
      <ChatHeaderButton
        data-active={open}
        onClick={() => setOpen((open) => !open)}
        ref={button}
        className={className}
      >
        <Icon sprite={filterIcon} />
      </ChatHeaderButton>
      {open && (
        <Overlay x={1} y={1} selfX={-1} anchor={button} onOuter={dismiss}>
          <Menu dismiss={dismiss}>
            <MenuItem
              onClick={() => dispatch(chatInGameFilter(pane))}
              icon={filter === 'IN_GAME' ? dotCircle : circle}
            >
              游戏内消息
            </MenuItem>
            <MenuItem
              onClick={() => dispatch(chatOutGameFilter(pane))}
              icon={filter === 'OUT_GAME' ? dotCircle : circle}
            >
              游戏外消息
            </MenuItem>
            <MenuItem
              onClick={() => dispatch(chatNoneFilter(pane))}
              icon={filter === 'NONE' ? dotCircle : circle}
            >
              所有消息
            </MenuItem>
            <MenuItem
              onClick={() => dispatch({ type: 'TOGGLE_SHOW_FOLDED' })}
              icon={showFolded ? check : uncheck}
            >
              显示折叠的消息
            </MenuItem>
          </Menu>
        </Overlay>
      )}
    </React.Fragment>
  );
}

export default Filter;
