import { LangParams, getIntl } from '@boluo/common/server';
import { ConfirmResetPassword } from './ConfirmResetPassword';
import { Metadata } from 'next';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Reset Password' }),
  };
}

interface Props {
  params: { token: string };
}

export default function Page({ params: { token } }: Props) {
  return (
    <div>
      <ConfirmResetPassword token={token} />
    </div>
  );
}
