import { backendUrlAtom, DEFAULT_BACKEND_URL, get } from 'api-browser';
import { useAtom, useAtomValue } from 'jotai';
import { FC, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Select } from 'ui';
import { SelectItem } from 'ui/Select';
import { proxiesAtom } from '../../state/info.atoms';

interface Props {
}

export const BaseUrlSelector: FC<Props> = () => {
  const intl = useIntl();
  const proxies = useAtomValue(proxiesAtom);
  const items: SelectItem[] = useMemo(() => {
    const defaultItem: SelectItem = {
      label: intl.formatMessage({ defaultMessage: 'Default' }),
      value: DEFAULT_BACKEND_URL,
    };
    return [defaultItem].concat(proxies.map((proxy): SelectItem => {
      let label = proxy.name;
      if (proxy.region) {
        label += ` (${proxy.region})`;
      }
      return ({ label, value: proxy.url });
    }));
  }, [proxies, intl]);
  const [backendUrl, setBackendUrl] = useAtom(backendUrlAtom);
  const apiUrl = useMemo(() => backendUrl.endsWith('/api') ? backendUrl : backendUrl + '/api', [backendUrl]);
  const [delay, setDelay] = useState<number | 'ERROR' | 'LOADING'>('LOADING');
  useEffect(() => {
    const handle = window.setInterval(() => {
      const base = new Date().getTime();
      setDelay('LOADING');
      get('/users/get_me', null, apiUrl).then(() => {
        const now = new Date().getTime();
        setDelay(now - base);
      }).catch(() => {
        setDelay('ERROR');
      });
    }, 1000);
    return () => window.clearInterval(handle);
  }, [apiUrl]);
  return (
    <div>
      <label className="flex flex-col gap-1">
        <FormattedMessage defaultMessage="Change Connection Region" />
        <div className="text-surface-900">
          <Select items={items} value={backendUrl} onChange={setBackendUrl} />
        </div>
        <div className="text-sm">
          <FormattedMessage defaultMessage="Delay" />: {delay === 'LOADING' && '...'}
          {delay === 'ERROR' && <FormattedMessage defaultMessage="Failed to connect" />}
          {typeof delay === 'number' && <span>{delay}</span>}
        </div>
      </label>
    </div>
  );
};
