import { css } from '@emotion/react';
import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { Proxy } from '../../base-url';
import { useBaseUrlDelay } from '../../hooks/useBaseUrlDelay';
import { useProxyList } from '../../hooks/useProxyList';
import { autoSelectAtom } from '../../states/connection';
import { useDispatch, useSelector } from '../../store';
import { flexCol, gap, pT, pX, pY, textXl } from '../../styles/atoms';
import { primary } from '../../styles/colors';
import { Delay } from '../atoms/Delay';
import Dialog from '../molecules/Dialog';

interface Props {
  dismiss: () => void;
}

const proxyItemStyle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${pY(2)};
  ${pX(2)};
  cursor: pointer;
  ${textXl};
  border-radius: 0.25rem;
`;

const currentItemStyle = css`
  background-color: ${primary[600]};
`;

const nonCurrentItemStyle = css`
  background-color: rgba(255,255,255,0.3);

  &:hover {
    background-color: rgba(255,255,255,0.5);
  }
`;

const ProxyItem = (
  { proxy, current, changeBaseUrl }: { proxy: Proxy; current: boolean; changeBaseUrl: (baseUrl: string) => void },
) => {
  const delay = useBaseUrlDelay(proxy.url);
  return (
    <div
      css={[proxyItemStyle, current ? currentItemStyle : nonCurrentItemStyle]}
      onClick={() => changeBaseUrl(proxy.url)}
    >
      <span>{proxy.name}</span>
      <Delay delay={delay} />
    </div>
  );
};

export const ConnectionSelectDialog = ({ dismiss }: Props) => {
  const [autoSelect, setAutoSelect] = useAtom(autoSelectAtom);
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const dispatch = useDispatch();
  const proxyList = useProxyList();
  const changeBaseUrl = useCallback((baseUrl: string) => dispatch({ type: 'CHANGE_BASE_URL', baseUrl }), [dispatch]);
  return (
    <Dialog title="选择线路" dismiss={dismiss} mask>
      <label>
        <input type="checkbox" checked={autoSelect} onChange={e => setAutoSelect(e.target.checked)} /> 自动选择线路
      </label>
      <div css={[flexCol, gap(1), pT(2)]}>
        {proxyList.map((proxy) => (
          <ProxyItem key={proxy.name} proxy={proxy} current={baseUrl === proxy.url} changeBaseUrl={changeBaseUrl} />
        ))}
      </div>
    </Dialog>
  );
};
