import { type Metadata } from 'next';
import { getIntl, type LangParams } from '@boluo/common/server';
import { CreateSpaceForm } from '../../../../components/CreateSpaceForm';
import Link from 'next/link';
import Icon from '@boluo/ui/Icon';
import { ChevronLeft } from '@boluo/icons';

import * as classes from '@boluo/ui/classes';
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
    <main className="bg-card-bg shadow-1 border-card-border shadow-card-shadow container max-w-md rounded-sm border p-6">
      <div>
        <Link href={`/${params.lang}`} className={classes.link}>
          <Icon icon={ChevronLeft} />
          {intl.formatMessage({ defaultMessage: 'Boluo' })}
        </Link>
      </div>
      <h1 className="mb-2 text-center text-xl">{title}</h1>
      <CreateSpaceForm />
    </main>
  );
}
