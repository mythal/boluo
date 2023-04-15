import { Message } from 'api';
import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { MessageBox } from './MessageBox';
import { Name } from './Name';

interface Props {
  message: Message;
  optimistic?: boolean;
  className?: string;
  self: boolean;
  continuous?: boolean;
}

export const ChatItemMessage: FC<Props> = (
  { message, className = '', optimistic = false, self, continuous = false },
) => {
  const { isMaster, isAction } = message;

  const name = useMemo(
    () => <Name name={message.name} isMaster={isMaster} self={self} />,
    [isMaster, message.name, self],
  );

  return (
    <MessageBox message={message} draggable={self} continuous={continuous} optimistic={optimistic}>
      <div className={clsx('@2xl:text-right', continuous ? 'hidden @2xl:block' : '')}>
        {continuous || isAction ? null : name}
      </div>
      <div>
        {isAction && name} {message.text}
      </div>
    </MessageBox>
  );
};
