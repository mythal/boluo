import { type Metadata } from 'next';
import { SignUpForm } from '../../../../../components/SignUpForm';
import { Footer } from './Footer';
import { type Params } from '../../../../../server';
import { getIntl } from '@boluo/locale/server';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const intl = await getIntl(await params);

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
