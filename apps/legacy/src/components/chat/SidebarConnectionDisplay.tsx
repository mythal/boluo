import { css } from '@emotion/react';
import { useAtomValue } from 'jotai';
import { transparentize } from 'polished';
import { type ReactNode, useState } from 'react';
import { useBaseUrlDelay } from '../../hooks/useBaseUrlDelay';
import { connectionStateAtom } from '../../states/connection';
import { useSelector } from '../../store';
import { pX, pY, textXs } from '../../styles/atoms';
import { green } from '../../styles/colors';
import { Delay } from '../atoms/Delay';
import { ConnectionSelectDialog } from './ConnectionSelectDialog';

const connected = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${pX(4)};
  ${pY(1)};
  ${textXs};
  background-color: ${transparentize(0.6)(green[500])};

  &:hover {
    cursor: pointer;
    background-color: ${transparentize(0.5)(green[500])};
  }
`;

const Connected = ({ baseUrl }: { baseUrl: string }) => {
  const delay = useBaseUrlDelay(baseUrl);
  return (
    <div css={connected}>
      <Delay delay={delay} />
      <span>切换线路</span>
    </div>
  );
};

const connecting = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  ${pX(4)};
  ${pY(1)};
  ${textXs};
`;

const Connecting = () => {
  return (
    <div css={connecting}>
      <span>连接中...</span>
      <span>切换线路</span>
    </div>
  );
};

const Closed = () => {
  return (
    <div css={connecting}>
      <span>未连接</span>
      <span>切换线路</span>
    </div>
  );
};

export const SidebarConnectionDisplay = () => {
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const [open, setOpen] = useState(false);
  const dismiss = () => setOpen(false);
  const connectionState = useAtomValue(connectionStateAtom);
  let display: ReactNode;
  switch (connectionState) {
    case 'OPEN':
      display = <Connected baseUrl={baseUrl} />;
      break;
    case 'CONNECTING':
      display = <Connecting />;
      break;
    case 'CLOSED':
      display = <Closed />;
      break;
  }
  return (
    <>
      <div onClick={() => setOpen(true)}>{display}</div>
      {open && <ConnectionSelectDialog dismiss={dismiss} />}
    </>
  );
};
