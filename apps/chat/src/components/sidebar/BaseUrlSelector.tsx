import { get } from 'api';
import { apiUrlAtom, useGet } from 'common';
import { DEFAULT_API_URL } from 'common/hooks/useApiUrl';
import { useAtom } from 'jotai';
import { FC, useEffect, useMemo, useState } from 'react';
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
  const [delay, setDelay] = useState<number | 'ERROR' | 'LOADING'>('LOADING');
  useEffect(() => {
    const base = new Date().getTime();
    setDelay('LOADING');
    get(apiUrl, '/users/get_me', null).then(() => {
      const now = new Date().getTime();
      setDelay(now - base);
    }).catch(() => {
      setDelay('ERROR');
    });
  }, [apiUrl]);
  return (
    <div>
      <label className="flex flex-col gap-1">
        <FormattedMessage defaultMessage="Change Connection Region" />
        <div className="text-surface-900">
          <Select items={items} value={apiUrl} onChange={changApiUrl} />
        </div>
        <div>
          <FormattedMessage defaultMessage="Delay" />: {delay === 'LOADING' && '...'}
          {delay === 'ERROR' && <FormattedMessage defaultMessage="Failed to connect" />}
          {typeof delay === 'number' && <span>{delay}</span>}
        </div>
      </label>
    </div>
  );
};
