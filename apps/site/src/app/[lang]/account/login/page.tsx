import { Metadata } from 'next';
import { LoginForm } from '../../../../components/LoginForm';
import { getIntl, LangParams } from '@boluo/common/server';
import { Footer } from './Footer';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Login' }),
  };
}

export default function Page() {
  return (
    <div>
      <LoginForm />
      <Footer />
    </div>
  );
}
