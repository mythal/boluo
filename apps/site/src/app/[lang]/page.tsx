import { LangParams, getIntl } from '@boluo/common/server';
import Link from 'next/link';
import { FC, ReactNode } from 'react';
import { UserOperations } from '../../components/UserOperations';

const Card: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div
      className={[
        'bg-card-bg border-card-border shadow-1/2 shadow-card-shadow max-w-lg rounded-sm border p-6',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
};

const Para: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return <p className={['py-1', className].join(' ')}>{children}</p>;
};

export default function Page({ params }: { params: LangParams }) {
  const intl = getIntl(params);
  return (
    <div className="grid grid-cols-1 grid-rows-[auto_auto_auto] gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="row-span-3">
        <Para className="text-sm">
          {intl.formatMessage({ defaultMessage: 'A chat application designed specifically for playing RPGs.' })}
        </Para>
        <h1 className="py-2 text-center text-xl">{intl.formatMessage({ defaultMessage: 'Boluo' })}</h1>

        <div className="py-2">
          <div className="bg-highest/5 flex h-20 w-full items-center justify-center italic">An Awesome Logo</div>
        </div>
      </Card>

      <Card>
        <UserOperations />
      </Card>
      <Card>
        <div className="font-bold">{intl.formatMessage({ defaultMessage: 'News' })}</div>
        <Para>Nothing new here.</Para>
      </Card>
      <Card>
        <Para className="text-sm">
          {intl.formatMessage({
            defaultMessage:
              'This is latest version of Boluo, which is still under active development. If you perfer the legacy version, please visit',
          })}{' '}
          <Link className="link" href="https://old.boluo.chat">
            old.boluo.chat
          </Link>
        </Para>
      </Card>
    </div>
  );
}
