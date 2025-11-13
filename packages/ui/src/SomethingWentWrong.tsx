import { type FC } from 'react';
import { OopsKaomoji } from './OopsKaomoji';
import { FormattedMessage } from 'react-intl';

interface Props {
  className?: string;
  noKaomoji?: boolean;
}

export const SomethingWentWrong: FC<Props> = ({ className, noKaomoji = false }) => {
  return (
    <span className={className}>
      {!noKaomoji && <OopsKaomoji />}{' '}
      <span>
        <FormattedMessage defaultMessage="Something went wrong" />
      </span>
    </span>
  );
};
