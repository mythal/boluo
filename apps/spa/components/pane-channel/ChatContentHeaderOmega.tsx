import { type FC, type ReactNode } from 'react';
import { useIntl } from 'react-intl';

interface Props {
  showOmega: boolean;
  alignToBottom: boolean;
  onToggle: () => void;
}

export const ChatContentHeaderOmega: FC<Props> = ({ showOmega, alignToBottom, onToggle }) => {
  const intl = useIntl();
  const noMore = intl.formatMessage({ defaultMessage: 'No more messages' });
  const symbol: ReactNode = showOmega ? (
    <span>Ω</span>
  ) : alignToBottom ? (
    <span>↧</span>
  ) : (
    <span>↥</span>
  );
  return (
    <div>
      <button
        onClick={onToggle}
        className="hover:bg-surface-interactive-hover cursor-pointer rounded-sm px-2 py-1"
      >
        <span className="text-text-muted font-serif text-lg font-semibold" title={noMore}>
          {symbol}
        </span>
      </button>
    </div>
  );
};
