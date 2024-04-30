'use client';

import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { CreateSpaceForm } from '../../../../../components/CreateSpaceForm';

export const CreateSpacePage: FC = () => {
  const intl = useIntl();
  const title = intl.formatMessage({ defaultMessage: 'Create a Space' });
  return (
    <>
      <main className="p-4">
        <h1 className="mb-2 text-xl">{title}</h1>
        <CreateSpaceForm />
      </main>
    </>
  );
};
