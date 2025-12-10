'use client';
import { ChevronLeft } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import { type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ButtonLink } from './ButtonLink';

export const BackLink: FC = () => {
  const intl = useIntl();
  return (
    <ButtonLink href="/">
      <Icon icon={ChevronLeft} />
      <FormattedMessage defaultMessage="Boluo" />
    </ButtonLink>
  );
};
