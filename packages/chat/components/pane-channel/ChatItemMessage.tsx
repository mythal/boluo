import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { fromRawEntities } from '../../interpreter/entities';
import { ParseResult } from '../../interpreter/parser';
import { MessageItem } from '../../state/channel.types';
import { Content } from './Content';
import { MessageBox } from './MessageBox';
import { Name } from './Name';

interface Props {
  message: MessageItem;
  className?: string;
  self: boolean;
  continuous?: boolean;
}

export const ChatItemMessage: FC<Props> = (
  { message, className = '', self, continuous = false },
) => {
  const { isMaster, isAction, optimistic } = message;

  const nameNode = useMemo(
    () => <Name name={message.name} isMaster={isMaster} self={self} />,
    [isMaster, message.name, self],
  );
  const parsed: ParseResult = useMemo((): ParseResult => {
    const text = message.text;
    const rawEntities = message.entities;
    if (!Array.isArray(rawEntities) || text === null) {
      return { text: '', entities: [] };
    }
    const entities = fromRawEntities(text, rawEntities);
    return { text, entities };
  }, [message.entities, message.text]);
  const mini = continuous || isAction;

  return (
    <MessageBox self={self} message={message} draggable={self} mini={mini} optimistic={optimistic}>
      <div className={clsx('self-start @2xl:text-right', mini ? 'hidden @2xl:block' : '')}>
        {!mini && <>{nameNode}:</>}
      </div>
      <div className="@2xl:pr-[6rem]">
        <Content parsed={parsed} isAction={isAction} nameNode={nameNode} isPreview={false} seed={message.seed} />
      </div>
    </MessageBox>
  );
};