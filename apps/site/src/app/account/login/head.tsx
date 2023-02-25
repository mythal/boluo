import { getIntlSync, title } from '../../../server';

export default function Head() {
  const intl = getIntlSync();
  return (
    <>
      <title>{title(intl, intl.formatMessage({ defaultMessage: 'Login' }))}</title>
    </>
  );
}
