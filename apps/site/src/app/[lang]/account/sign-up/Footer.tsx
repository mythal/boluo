'use client';
import { ChevronLeft } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { ButtonLink } from '../../../../components/ButtonLink';

interface Props {}

export function Footer(props: Props) {
  return (
    <div>
      <ButtonLink href="/account/login">
        <ChevronLeft />
        <FormattedMessage defaultMessage="Login" />
      </ButtonLink>
    </div>
  );
}
