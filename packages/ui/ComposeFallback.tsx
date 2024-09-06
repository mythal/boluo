import { type FC } from 'react';
import { TextInput } from './TextInput';
import { FormattedMessage } from 'react-intl';

export const ComposeFallback: FC<{ source: string | undefined | null }> = ({ source }) => {
  const empty = source == null || source.trim() === '';
  return (
    <div className="ComposeFallback px-4 py-2">
      {empty ? (
        <span className="text-text-light">
          <FormattedMessage defaultMessage="Oops! The compose box crashed." />
        </span>
      ) : (
        <div className="text-text-light pb-1 text-sm">
          <span>
            <FormattedMessage defaultMessage="Oops! The compose box crashed, Your last input was:" />
          </span>
        </div>
      )}
      {source && <TextInput readOnly className="w-full py-2 font-mono" value={source} />}
    </div>
  );
};
