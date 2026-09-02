import Prando from 'prando';
import * as React from 'react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Gamemaster from '@boluo/icons/legacy/Gamemaster';
import { useChannelId } from '../../hooks/useChannelId';
import { useSelector } from '../../store';
import { genColor } from '../../utils/game';
import { type Id } from '../../utils/id';
import Icon from '../atoms/Icon';
import Tooltip from '../atoms/Tooltip';

interface Props {
  name: string;
  master: boolean;
  action: boolean;
  inGame: boolean;
  userId: Id;
}

const colorMap: Record<string, string> = {};

function ChatItemName({ name, userId, master }: Props) {
  const pane = useChannelId();
  const nickname = useSelector(
    (state) =>
      state.chatStates.get(pane)!.members.find((member) => member.user.id === userId)?.user
        .nickname,
  );
  const linkRef = useRef<HTMLAnchorElement>(null);
  if (!colorMap[name]) {
    const rng = new Prando(userId);
    colorMap[name] = genColor(rng);
  }
  const color = colorMap[name];
  return (
    <span className="group/chat-name mr-1 leading-[1.6rem]">
      <div className="relative inline">
        <Link
          ref={linkRef}
          className="relative font-bold no-underline"
          style={{ color }}
          to={`/profile/${userId}`}
        >
          {name}
        </Link>
        {nickname && (
          <Tooltip className="invisible text-[0.875rem] select-none group-hover/chat-name:visible">
            {nickname}
          </Tooltip>
        )}
      </div>
      {master && <Icon className="text-legacy-gray-500 ml-0.5" icon={Gamemaster} />}
    </span>
  );
}

export default React.memo(ChatItemName);
