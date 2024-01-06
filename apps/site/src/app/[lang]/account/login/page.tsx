import { Metadata } from 'next';
import Link from 'next/link';
import { FormattedMessage } from 'react-intl';
import { LoginForm } from '../../../../components/LoginForm';
import { getIntl, LangParams } from '../../../../server';
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
