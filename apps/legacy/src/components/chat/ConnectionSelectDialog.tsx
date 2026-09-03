import { useAtom } from 'jotai';
import { useCallback, useState } from 'react';
import { type Proxy } from '../../base-url';
import { useBaseUrlDelay } from '../../hooks/useBaseUrlDelay';
import { useProxyList } from '../../hooks/useProxyList';
import { autoSelectAtom } from '../../states/connection';
import { useDispatch, useSelector } from '../../store';
import { cls } from '../../utils/classnames';
import { Delay } from '../atoms/Delay';
import { DelayWithStats } from '../atoms/DelayWithStats';
import Dialog from '../molecules/Dialog';

interface Props {
  dismiss: () => void;
}

const ProxyItem = ({
  proxy,
  current,
  changeBaseUrl,
  showStats,
}: {
  proxy: Proxy;
  current: boolean;
  changeBaseUrl: (baseUrl: string) => void;
  showStats: boolean;
}) => {
  const delay = useBaseUrlDelay(proxy.url);
  return (
    <div
      className={cls(
        'flex cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-[1.25rem]',
        current
          ? 'bg-legacy-primary-600'
          : 'bg-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.5)]',
      )}
      onClick={() => changeBaseUrl(proxy.url)}
    >
      <span>{proxy.name}</span>
      {showStats ? (
        <DelayWithStats delay={delay} url={proxy.url} showStats={true} />
      ) : (
        <Delay delay={delay} />
      )}
    </div>
  );
};

export const ConnectionSelectDialog = ({ dismiss }: Props) => {
  const [autoSelect, setAutoSelect] = useAtom(autoSelectAtom);
  const [showStats, setShowStats] = useState(false);
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const dispatch = useDispatch();
  const proxyList = useProxyList();
  const changeBaseUrl = useCallback(
    (baseUrl: string) => dispatch({ type: 'CHANGE_BASE_URL', baseUrl }),
    [dispatch],
  );
  return (
    <Dialog title="选择线路" dismiss={dismiss} mask>
      <label>
        <input
          type="checkbox"
          checked={autoSelect}
          onChange={(e) => setAutoSelect(e.target.checked)}
        />{' '}
        自动选择线路
      </label>
      <label className="ml-4">
        <input
          type="checkbox"
          checked={showStats}
          onChange={(e) => setShowStats(e.target.checked)}
        />{' '}
        显示统计信息
      </label>
      <div className="flex flex-col gap-1 pt-2">
        {proxyList.map((proxy) => (
          <ProxyItem
            key={proxy.name}
            proxy={proxy}
            current={baseUrl === proxy.url}
            changeBaseUrl={changeBaseUrl}
            showStats={showStats}
          />
        ))}
      </div>
    </Dialog>
  );
};
