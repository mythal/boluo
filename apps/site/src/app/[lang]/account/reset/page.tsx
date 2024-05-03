import { LangParams, getIntl } from '@boluo/common/server';
import { ResetPassword } from './ResetPassword';
import { Metadata } from 'next';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);

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
