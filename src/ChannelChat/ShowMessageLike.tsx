import React from 'react';
import { Entity } from '../entities';
import { MessageContent } from './MessageContent';

interface Props {
  name: string;
  text: string;
  entities: Entity[];
  isPreview: boolean;
  isAction: boolean;
  isMaster: boolean;
  inGame: boolean;
  seed?: number[];
  color?: string;
}

export const ShowMessageLike: React.FC<Props> = props => {
  const { name, text, entities, seed, color, inGame, isPreview } = props;
  const style: React.CSSProperties = inGame ? { color } : {};
  const isTyping = isPreview && text.length === 0 && entities.length === 0;
  const isAction = isTyping || props.isAction;
  return (
    <div
      className={`px-5 py-2 ${inGame ? 'text-lg hover:bg-gray-200' : ' bg-gray-700 hover:bg-gray-800 text-white'} ${
        isAction ? 'italic text-center' : ''
      }`}
      style={style}
    >
      <div className="inline-block font-bold mr-2">
        {name}
        {!isAction ? ':' : ''}
      </div>
      {isTyping ? <span>正在输入...</span> : <MessageContent text={text} entities={entities} seed={seed} />}
    </div>
  );
};
