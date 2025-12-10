import { getIntl } from '@boluo/locale/server';
import { type Params } from '../../../../../../../server';
import { ConfirmResetPassword } from './ConfirmResetPassword';
import { type Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const intl = await getIntl(await params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Reset Password' }),
  };
}

interface Props {
  params: Promise<{ token: string }>;
}

export default async function Page({ params }: Props) {
  const { token } = await params;
  return (
    <div>
      <ConfirmResetPassword token={token} />
    </div>
  );
}
