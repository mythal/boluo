import { Metadata } from 'next';
import { LoginForm } from '../../../../../components/LoginForm';
import { Footer } from './Footer';
import { Params } from '../../../../../server';
import { getIntl } from '@boluo/common/locale';

type Props = {
  params: Promise<Params>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const intl = await getIntl(await params);

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
