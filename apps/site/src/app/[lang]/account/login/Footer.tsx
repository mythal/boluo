'use client';
import { ChevronLeft } from 'icons';
import { FormattedMessage } from 'react-intl';
import { Link } from '../Link';

interface Props {
}

export function Footer(props: Props) {
  return (
    <div>
      <Link href="/account/sign-up">
        <ChevronLeft />
        <FormattedMessage defaultMessage="Sign Up" />
      </Link>
    </div>
  );
}
