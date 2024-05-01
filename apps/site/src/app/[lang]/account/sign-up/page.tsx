import { Metadata } from 'next';
import { SignUpForm } from '../../../../components/SignUpForm';
import { getIntl, LangParams } from '@boluo/common/server';
import { Footer } from './Footer';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Sign Up' }),
  };
}

export default function Page() {
  return (
    <div>
      <SignUpForm />
      <Footer />
    </div>
  );
}
