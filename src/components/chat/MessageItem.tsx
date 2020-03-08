import React, { useEffect, useState } from 'react';
import { Entity } from '../../entities';
import { MessageContent } from './MessageContent';
import { Name } from './Name';
import { cls } from '../../classname';
import { MessageMenu } from './MessageMenu';
import { useMember } from './ChannelChat';
import { mediaUrl } from '../../api/media';

interface Props {
  id: string;
  text: string;
  entities: Entity[];
  name: string;
  isPreview: boolean;
  isAction: boolean;
  isMaster: boolean;
  inGame: boolean;
  folded: boolean;
  seed?: number[];
  color?: string;
  time: number;
  mediaId: string | null;
}

const num = (n: number) => (n > 9 ? String(n) : `0${n}`);

export const MessageItem = React.memo<Props>(props => {
  const { name, inGame, color, text, seed, isPreview, isMaster, entities, mediaId } = props;
  const style: React.CSSProperties = inGame ? { color } : {};
  const isTyping = isPreview && text.length === 0 && entities.length === 0;
  const isAction = isTyping || props.isAction;
  const time = new Date(props.time);
  const [folded, setFolded] = useState(props.folded);
  const member = useMember();

  useEffect(() => setFolded(props.folded), [props.folded]);

  const toggleFold = () => {
    if (props.folded) {
      setFolded(!folded);
    }
  };

  return (
    <div className={cls('group bg-gray-100 w-full', { 'active:bg-gray-400 cursor-pointer': props.folded })}>
      {props.folded && (
        <div
          className={cls(
            'text-center text-xs p-1 cursor-pointer select-none text-gray-500 group-hover:bg-gray-200',
            { 'hover:bg-gray-200': inGame },
            { '': !inGame },
            { italic: folded },
            { '': !folded },
            { 'bg-gray-300 text-gray-800': !folded && inGame },
            { '': folded && !inGame },
            { 'bg-gray-800 text-gray-300 group-hover:bg-gray-700': !folded && !inGame }
          )}
          onClick={toggleFold}
        >
          隐藏的消息 [{folded ? '+' : '-'}]
        </div>
      )}
      <div
        className={cls(
          'flex w-full items-center items-stretch transform overflow-hidden message-item max-h-screen transition-size duration-500 pr-1',
          { 'bg-gray-900 text-white text-xs': !inGame },
          { 'stripe-light': isPreview && inGame },
          { 'stripe-dark': isPreview && !inGame },
          { 'cursor-pointer': props.folded },
          { 'bg-gray-200 hover:bg-gray-300': props.folded && inGame },
          { 'group-hover:bg-gray-800': props.folded && !inGame },
          { 'max-h-0': folded }
        )}
        onClick={toggleFold}
        style={style}
      >
        <div
          className={cls(
            'text-xs hidden md:block flex-none py-2 pl-1 w-24 text-gray-500 font-mono',
            inGame ? 'group-hover:text-gray-700' : 'group-hover:text-gray-300'
          )}
        >
          {num(time.getHours())}:{num(time.getMinutes())}:{num(time.getSeconds())}
        </div>
        <div className="flex-none w-24 py-2 pl-1 text-right border-r pr-2 mr-2 border-gray-500">
          {!isAction && <Name name={name} />}
        </div>
        <div
          className={cls(
            'py-2 flex-grow flex-shrink w-px truncate',
            { italic: isAction },
            { 'line-through': props.folded }
          )}
        >
          {isAction && <Name className="mr-2" name={name} />}
          {isTyping ? <span>正在输入...</span> : <MessageContent text={text} entities={entities} seed={seed} />}
          {mediaId && <img alt="用户上传的图片" className="w-full max-w-sm" src={mediaUrl(mediaId)} />}
        </div>
        {!isPreview && member.channel && member.space && (
          <div
            className={cls(
              'flex-none opacity-0 group-hover:opacity-100 text-sm text-right mr-2',
              inGame ? 'text-black' : 'text-white'
            )}
          >
            <MessageMenu
              id={props.id}
              folded={props.folded}
              inGame={inGame}
              spaceMember={member.space}
              channelMember={member.channel}
              text={text}
            />
          </div>
        )}
      </div>
    </div>
  );
});
