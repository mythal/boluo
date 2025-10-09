import { type Message } from '@boluo/api';
import { type FC, useContext } from 'react';
import { generateDetailDate, pad2 } from '../../date';
import { useSetAtom } from 'jotai';
import { DisplayContext as ToolbarDisplayContext } from './MessageToolbar';
import { type FailTo } from '../../state/channel.types';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { AlertTriangle } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';

interface Props {
  message: Message;
  failTo: FailTo | null | undefined;
}

export const MessageTime: FC<Props> = ({ message, failTo }) => {
  const date = new Date(message.created);
  const setToolbarDisplay = useSetAtom(useContext(ToolbarDisplayContext));
  const edited = message.modified !== message.created;
  if (failTo) {
    return (
      <span className="text-state-danger-text text-xs">
        <Delay fallback={<FallbackIcon />}>
          <Icon icon={AlertTriangle} />
        </Delay>
        <span className="ml-0.5">
          <FormattedMessage defaultMessage="Error" />
        </span>
      </span>
    );
  }
  return (
    <time
      data-edited={edited}
      className="text-text-muted text-xs decoration-dotted data-[edited=true]:underline"
      dateTime={message.created}
      title={generateDetailDate(date)}
      onTouchEnd={(e) => {
        e.preventDefault();

        setToolbarDisplay({ type: 'MORE' });
      }}
    >
      {pad2(date.getHours())}:{pad2(date.getMinutes())}
    </time>
  );
};
