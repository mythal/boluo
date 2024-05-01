import { LangParams, getIntl } from '@boluo/common/server';
import { ChevronLeft } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function Layout({ children, params }: { children: ReactNode; params: LangParams }) {
  const intl = getIntl(params);
  return (
    <div className="@md:container mx-auto p-8">
      <div className="border-card-border shadow-1/2 bg-card-bg shadow-card-shadow w-full rounded-sm border p-6 md:w-[20rem]">
        <Link href={`/${params.lang}`} className="link">
          <Icon icon={ChevronLeft} />
          {intl.formatMessage({ defaultMessage: 'Boluo' })}
        </Link>
        {children}
      </div>
    </div>
  );
}
