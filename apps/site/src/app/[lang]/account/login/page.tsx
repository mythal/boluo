import { Metadata } from 'next';
import { LoginForm } from '../../../../components/LoginForm';
import { getIntl, LangParams } from '../../../../server';

export function generateMetadata(
  { params }: { params: LangParams },
): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Login' }),
  };
}

export default function Page() {
  return <LoginForm />;
}
