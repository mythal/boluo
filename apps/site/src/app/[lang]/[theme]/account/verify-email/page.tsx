import { Metadata } from 'next';
import { Params } from '../../../../../server';
import { getIntl } from '@boluo/common/locale';
import { EmailVerification } from './EmailVerification';

type Props = {
  params: Promise<Params>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const intl = await getIntl(await params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Verify Email' }),
  };
}

export default function Page() {
  return <EmailVerification />;
}
