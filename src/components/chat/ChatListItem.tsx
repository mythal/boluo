import React from 'react';
import { Map } from 'immutable';
import { ChatItem } from '../../states/chat';
import { Id } from '../../id';
import { MessageItem } from './MessageItem';
import { DayDivider } from './DayDivider';

interface Props {
  item: ChatItem;
  colorMap: Map<Id, string>;
}

export const ChatListItem = React.memo<Props>(({ item, colorMap }) => {
  if (item.type === 'MESSAGE') {
    const { text, entities, name, isAction, isMaster, inGame, seed, created } = item.message;
    const color = colorMap.get(item.message.senderId);
    return (
      <MessageItem
        isPreview={false}
        text={text}
        entities={entities}
        name={name}
        isAction={isAction}
        isMaster={isMaster}
        inGame={inGame}
        color={color}
        seed={seed}
        time={created}
      />
    );
  } else if (item.type === 'PREVIEW') {
    const { text, entities, name, isAction, isMaster, inGame, start } = item.preview;
    const color = colorMap.get(item.preview.senderId);
    return (
      <MessageItem
        isPreview={true}
        text={text}
        entities={entities}
        name={name}
        isAction={isAction}
        isMaster={isMaster}
        inGame={inGame}
        color={color}
        time={start}
      />
    );
  } else if (item.type === 'DAY_DIVIDER') {
    return <DayDivider key={item.date.getTime()} date={item.date} />;
  } else {
    return null;
  }
});
