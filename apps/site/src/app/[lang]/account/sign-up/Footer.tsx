'use client';
import { ChevronLeft } from 'icons';
import { FormattedMessage } from 'react-intl';
import { Link } from '../Link';

interface Props {}

export function Footer(props: Props) {
  return (
    <div>
      <Link href="/account/login">
        <ChevronLeft />
        <FormattedMessage defaultMessage="Login" />
      </Link>
    </div>
  );
}
