import { FormattedMessage } from 'react-intl';

interface Props {
  count: number;
}

export const BroadcastTurnedOff = ({ count }: Props) => {
  const dot = count % 3;
  return (
    <div className="text-text-secondary">
      *
      <span className="px-1 italic">
        <FormattedMessage defaultMessage="Broadcast has been turned off" />
        <span className={dot === 0 ? '' : 'opacity-15'}>.</span>
        <span className={dot === 1 ? '' : 'opacity-15'}>.</span>
        <span className={dot === 2 ? '' : 'opacity-15'}>.</span>
      </span>
      *
    </div>
  );
};
