import { Metadata } from 'next';
import { getIntl, LangParams } from '@boluo/common/server';
import { CreateSpaceForm } from '../../../../components/CreateSpaceForm';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Create Space' }),
  };
}

export default function Page({ params }: { params: LangParams }) {
  const intl = getIntl(params);
  const title = intl.formatMessage({ defaultMessage: 'Create a Space' });
  return (
    <main className="bg-card-bg shadow-1 shadow-card-shadow container m-4 max-w-md p-4 md:m-8">
      <h1 className="mb-2 text-xl">{title}</h1>
      <CreateSpaceForm />
    </main>
  );
}
