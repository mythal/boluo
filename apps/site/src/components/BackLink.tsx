'use client';
import { ChevronLeft } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import Link from 'next/link';
import { FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

export const BackLink: FC = () => {
  const intl = useIntl();
  return (
    <Link href={`/${intl.locale}`} className="link">
      <Icon icon={ChevronLeft} />
      <FormattedMessage defaultMessage="Boluo" />
    </Link>
  );
};
