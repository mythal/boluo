import { Metadata } from 'next';
import { getIntl, LangParams } from '../../../../server';
import { CreateSpacePage } from './CreateSpacePage';

export function generateMetadata(
  { params }: { params: LangParams },
): Metadata {
  const intl = getIntl(params);

  return {
    title: intl.formatMessage({ defaultMessage: 'Create Space' }),
  };
}

export default function Page() {
  return <CreateSpacePage />;
}
