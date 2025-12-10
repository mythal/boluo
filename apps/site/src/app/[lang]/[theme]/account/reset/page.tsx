import { getIntl } from '@boluo/locale/server';
import { type Params } from '../../../../../server';
import { ResetPassword } from './ResetPassword';
import { type Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const intl = await getIntl(await params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Reset Password' }),
  };
}

export default function Page() {
  return (
    <div>
      <ResetPassword />
    </div>
  );
}
