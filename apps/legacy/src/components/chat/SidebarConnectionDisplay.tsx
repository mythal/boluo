import { useAtomValue } from 'jotai';
import { type ReactNode, useState } from 'react';
import { useBaseUrlDelay } from '../../hooks/useBaseUrlDelay';
import { connectionStateAtom } from '../../states/connection';
import { useSelector } from '../../store';
import { Delay } from '../atoms/Delay';
import { ConnectionSelectDialog } from './ConnectionSelectDialog';

const Connected = ({ baseUrl }: { baseUrl: string }) => {
  const delay = useBaseUrlDelay(baseUrl);
  return (
    <div className="bg-legacy-connection-background hover:bg-legacy-connection-hover flex cursor-pointer items-center justify-between px-4 py-1 text-[0.75rem]">
      <Delay delay={delay} />
      <span>切换线路</span>
    </div>
  );
};

const Connecting = () => {
  return (
    <div className="flex cursor-pointer items-center justify-between px-4 py-1 text-[0.75rem]">
      <span>连接中...</span>
      <span>切换线路</span>
    </div>
  );
};

const Closed = () => {
  return (
    <div className="flex cursor-pointer items-center justify-between px-4 py-1 text-[0.75rem]">
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
      <button
        aria-haspopup="dialog"
        className="legacy-sidebar-connection-trigger w-full cursor-pointer border-0 bg-transparent p-0 text-inherit"
        onClick={() => setOpen(true)}
        type="button"
      >
        {display}
      </button>
      {open && <ConnectionSelectDialog dismiss={dismiss} />}
    </>
  );
};
