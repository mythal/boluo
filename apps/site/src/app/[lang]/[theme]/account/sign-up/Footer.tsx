'use client';
import ChevronLeft from '@boluo/icons/ChevronLeft';
import { FormattedMessage } from 'react-intl';
import { ButtonLink } from '../../../../../components/ButtonLink';

export function Footer() {
  return (
    <div>
      <ButtonLink href="/account/login">
        <ChevronLeft />
        <FormattedMessage defaultMessage="Login" />
      </ButtonLink>
    </div>
  );
}
