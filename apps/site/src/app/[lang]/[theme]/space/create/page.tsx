import { type Metadata } from 'next';
import { CreateSpaceForm } from '../../../../../components/CreateSpaceForm';
import Link from 'next/link';
import Icon from '@boluo/ui/Icon';
import { ChevronLeft } from '@boluo/icons';

import * as classes from '@boluo/ui/classes';
import { type Params } from '../../../../../server';
import { getIntl } from '@boluo/locale/server';
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const intl = await getIntl(await params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Create Space' }),
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { lang } = await params;
  const intl = await getIntl({ lang });
  const title = intl.formatMessage({ defaultMessage: 'Create a Space' });
  return (
    <main className="bg-surface-raised shadow-1 border-border-raised container max-w-md rounded-sm border p-6">
      <div>
        <Link href={`/${lang}`} className={classes.link}>
          <Icon icon={ChevronLeft} />
          {intl.formatMessage({ defaultMessage: 'Boluo' })}
        </Link>
      </div>
      <h1 className="mb-2 text-center text-xl">{title}</h1>
      <CreateSpaceForm />
    </main>
  );
}
