'use client';
import { ChevronLeft } from '@boluo/icons';
import { FormattedMessage } from 'react-intl';
import { ButtonLink } from '../../../../components/ButtonLink';
import Link from 'next/link';

interface Props {}

export function Footer(props: Props) {
  return (
    <div className="flex items-center justify-between">
      <ButtonLink href="/account/sign-up">
        <ChevronLeft />
        <FormattedMessage defaultMessage="Sign Up" />
      </ButtonLink>

      <div>
        <Link className="link" href="/account/reset">
          <FormattedMessage defaultMessage="Forgot password?" />
        </Link>
      </div>
    </div>
  );
}
