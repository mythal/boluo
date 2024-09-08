import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ComposeFallbackBox } from './ComposeFallbackBox';

export const ComposeFallback: FC<{ source: string | undefined | null }> = ({ source }) => {
  const empty = source == null || source.trim() === '';
  const description = empty ? (
    <span>
      <FormattedMessage defaultMessage="The compose box crashed." />
    </span>
  ) : (
    <span>
      <FormattedMessage defaultMessage="The compose box crashed, Your last input was:" />
    </span>
  );
  return <ComposeFallbackBox description={description} source={source} />;
};
