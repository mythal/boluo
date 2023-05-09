import { Metadata } from 'next';
import { SignUpForm } from '../../../components/SignUpForm';
import { getIntl, title } from '../../../server';

export async function generateMetadata(): Promise<Metadata> {
  const intl = await getIntl();
  return {
    title: title(intl, intl.formatMessage({ defaultMessage: 'Sign Up' })),
  };
}
export default function Page() {
  return <SignUpForm />;
}
