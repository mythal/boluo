import * as React from 'react';
import { Suspense } from 'react';
import Loading from '../../components/molecules/Loading';
import Header from '../organisms/Header';

interface Props {
  children: React.ReactNode;
}

function BasePage({ children }: Props) {
  return (
    <div>
      <Header />
      <div className="px-6 py-6">
        <div className="mx-auto max-w-[50em]">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}

export default BasePage;
