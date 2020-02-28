import React from 'react';
import { Entity } from '../../entities';
import { MessageContent } from './MessageContent';
import { Name } from './Name';
import { cls } from '../../classname';

interface Props {
  text: string;
  entities: Entity[];
  name: string;
  isPreview: boolean;
  isAction: boolean;
  isMaster: boolean;
  inGame: boolean;
  seed?: number[];
  color?: string;
  time: number;
}

const num = (n: number) => (n > 9 ? String(n) : `0${n}`);

export const MessageItem = React.memo<Props>(props => {
  const { name, inGame, color, text, seed, isPreview, isMaster, entities } = props;
  const style: React.CSSProperties = inGame ? { color } : {};
  const isTyping = isPreview && text.length === 0 && entities.length === 0;
  const isAction = isTyping || props.isAction;
  const time = new Date(props.time);
  return (
    <div
      className={cls(
        'flex w-full items-center hover:bg-gray-200',
        { 'bg-gray-900 text-white text-xs hover:bg-gray-800': !inGame },
        { 'preview-item': isPreview }
      )}
      style={style}
    >
      <div className="hidden md:block flex-none pl-1 w-24 text-gray-400 font-mono">
        {num(time.getHours())}:{num(time.getMinutes())}:{num(time.getSeconds())}
      </div>
      <div className="flex-none h-full w-24 py-2 pl-1 text-right border-r pr-2 mr-2 border-gray-500">
        {!isAction && <Name name={name} />}
      </div>
      <div className={cls('py-2', { italic: isAction })}>
        {isAction && <Name className="mr-2" name={name} />}
        {isTyping ? <span>正在输入...</span> : <MessageContent text={text} entities={entities} seed={seed} />}
      </div>
    </div>
  );
});
