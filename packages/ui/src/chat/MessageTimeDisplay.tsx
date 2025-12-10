import { type FC } from 'react';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import Icon from '../Icon';
import AlertTriangle from '@boluo/icons/AlertTriangle';
import { generateDetailDate, pad2 } from '@boluo/utils/date';
import { FormattedMessage } from 'react-intl';

interface Props {
  failed?: boolean;
  createdAt: Date;
  edited?: boolean;
  onTouchEnd?: (e: React.TouchEvent<HTMLElement>) => void;
}

export const MessageTimeDisplay: FC<Props> = ({
  failed,
  createdAt,
  edited = false,
  onTouchEnd,
}) => {
  if (failed) {
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
  const dateTime = createdAt.toISOString();

  return (
    <time
      data-edited={edited}
      className="text-text-muted text-xs decoration-dotted data-[edited=true]:underline"
      dateTime={dateTime}
      title={generateDetailDate(createdAt)}
      onTouchEnd={onTouchEnd}
    >
      {pad2(createdAt.getHours())}:{pad2(createdAt.getMinutes())}
    </time>
  );
};
