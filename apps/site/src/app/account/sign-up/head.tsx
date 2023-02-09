import { getIntlSync, title } from '../../../helper/server';

export default function Head() {
  const intl = getIntlSync();
  return (
    <>
      <title>{title(intl, intl.formatMessage({ defaultMessage: 'Sign Up' }))}</title>
    </>
  );
}
