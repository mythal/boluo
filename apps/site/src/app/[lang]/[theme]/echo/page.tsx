import { type Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { type Params } from '../../../../server';
import { getIntl } from '@boluo/locale/server';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const intl = await getIntl(await params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Echo' }),
  };
}

export default async function Page() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="italic">
        This is an echo page. It will echo back the headers and cookies that were.
      </div>
      <div>
        <div className="text-xl">Headers:</div>
        <div className="font-mono">{JSON.stringify(await headers())}</div>
      </div>
      <div>
        <div className="text-xl">Cookies:</div>
        <div>
          <pre className="font-mono">{(await cookies()).toString()}</pre>
        </div>
      </div>
    </div>
  );
}
