import { apiUrlAtom } from 'common';
import { DEFAULT_API_URL } from 'common/hooks/useApiUrl';
import { useAtom } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Select } from 'ui';
import { SelectItem } from 'ui/Select';

interface Props {
}

export const BaseUrlSelector: FC<Props> = () => {
  const intl = useIntl();
  const items: SelectItem[] = useMemo(() => [
    { label: intl.formatMessage({ defaultMessage: 'Default' }), value: DEFAULT_API_URL + '/api' },
    { label: 'JP (GCE)', value: 'https://gce.boluo.chat/api' },
    { label: 'Cloudflare', value: 'https://cloudflare.boluo.chat/api' },
    { label: 'JP (NNC)', value: 'https://raylet.boluo.chat/api' },
  ], [intl]);
  const [apiUrl, changApiUrl] = useAtom(apiUrlAtom);
  return (
    <div>
      <label className="flex flex-col gap-1">
        <FormattedMessage defaultMessage="Change Connection Region" />
        <div className="text-surface-900">
          <Select items={items} value={apiUrl} onChange={changApiUrl} />
        </div>
      </label>
    </div>
  );
};
