'use client';
import ChevronLeft from '@boluo/icons/ChevronLeft';
import { FormattedMessage } from 'react-intl';
import { ButtonLink } from '../../../../../components/ButtonLink';
import Link from 'next/link';
import * as classes from '@boluo/ui/classes';

export function Footer() {
  return (
    <div className="flex items-center justify-between">
      <ButtonLink href="/account/sign-up">
        <ChevronLeft />
        <FormattedMessage defaultMessage="Sign Up" />
      </ButtonLink>

      <div>
        <Link className={classes.link} href="/account/reset">
          <FormattedMessage defaultMessage="Forgot password?" />
        </Link>
      </div>
    </div>
  );
}
