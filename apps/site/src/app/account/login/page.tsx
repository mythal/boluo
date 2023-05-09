import { Metadata } from 'next';
import { LoginForm } from '../../../components/LoginForm';
import { getIntl, title } from '../../../server';

export async function generateMetadata(): Promise<Metadata> {
  const intl = await getIntl();
  return {
    title: title(intl, intl.formatMessage({ defaultMessage: 'Login' })),
  };
}

export default function Page() {
  return <LoginForm />;
}
