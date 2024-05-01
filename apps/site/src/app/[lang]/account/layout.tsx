import { LangParams } from '@boluo/common/server';
import type { ReactNode } from 'react';
import { BackLink } from '../../../components/BackLink';

export default function Layout({ children, params }: { children: ReactNode; params: LangParams }) {
  return (
    <div className="@md:container mx-auto p-8">
      <div className="border-card-border shadow-1/2 bg-card-bg shadow-card-shadow w-full rounded-sm border p-6 md:w-[20rem]">
        <BackLink />
        {children}
      </div>
    </div>
  );
}
