import { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { getIntl, LangParams } from '../../../server';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Echo' }),
  };
}

export default function Page() {
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="italic">This is an echo page. It will echo back the headers and cookies that were.</div>
      <div>
        <div className="text-xl">Headers:</div>
        <div className="font-mono">{JSON.stringify(headers())}</div>
      </div>
      <div>
        <div className="text-xl">Cookies:</div>
        <div>
          <pre className="font-mono">{cookies().toString()}</pre>
        </div>
      </div>
    </div>
  );
}
