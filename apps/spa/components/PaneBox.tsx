import clsx from 'clsx';
import { FC, ReactNode, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { ChildrenProps } from '@boluo/utils';
import { usePaneFocus } from '../hooks/usePaneFocus';
import { Delay } from './Delay';
import { PaneBodyError } from './PaneBodyError';
import { BannerContext } from '../hooks/useBannerNode';
import { selectAtom } from 'jotai/utils';
import { PaneContext } from '../state/view.context';
import { panesAtom } from '../state/view.atoms';
import { PaneData } from '../state/view.types';
import { useAtomValue } from 'jotai';
import { IsChildPaneContext, useIsChildPane } from '../hooks/useIsChildPane';
import { ChildPaneSwitch } from './PaneSwitch';
import { PaneSize, PaneSizeContext } from '../hooks/usePaneSize';

interface Props extends ChildrenProps {
  header?: ReactNode;
  grow?: boolean;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

export const PaneBox: FC<Props> = ({ header, children, grow = false }) => {
  const { key: paneKey } = useContext(PaneContext);
  const focus = usePaneFocus();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const isChildPane = useIsChildPane();
  const childPaneAtom = useMemo(
    () =>
      selectAtom(panesAtom, (panes): PaneData | undefined => {
        if (isChildPane) {
          return undefined;
        }
        const pane = panes.find((pane) => pane.key === paneKey);
        return pane?.child;
      }),
    [isChildPane, paneKey],
  );
  const childPane: PaneData | undefined = useAtomValue(childPaneAtom);
  const [size, setSize] = useState<PaneSize>('NORMAL');
  useEffect(() => {
    const box = boxRef.current;
    if (box == null) {
      console.warn('No pane box');
      return;
    }
    const POINT = 672;
    setSize(box.clientWidth > POINT ? 'NORMAL' : 'SMALL');

    const sizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry == null) {
        console.warn('Unreachable');
      }
      setSize(box.clientWidth > POINT ? 'NORMAL' : 'SMALL');
    });
    sizeObserver.observe(box);
    return () => {
      sizeObserver.disconnect();
    };
  }, []);
  const content = (
    <div onClick={focus} className="@container relative flex h-full min-h-0 flex-[1_1_100%] flex-col">
      {isChildPane && <div className="bg-pane-header-border absolute top-0 h-px w-full" />}
      {header}
      <div ref={bannerRef}></div>

      <div className="relative">
        <div className="bg-pane-header-border absolute z-10 h-[2px] w-full"></div>
      </div>

      <div onFocus={focus} className="bg-pane-bg relative flex-grow overflow-y-auto overflow-x-hidden">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loading />
            </div>
          }
        >
          <PaneBodyError>
            <Delay timeout={32} fallback={<Placeholder />}>
              {children}
            </Delay>
          </PaneBodyError>
        </Suspense>
      </div>
    </div>
  );
  if (isChildPane) {
    return content;
  }
  return (
    <BannerContext.Provider value={bannerRef}>
      <PaneSizeContext.Provider value={size}>
        <div
          ref={boxRef}
          className={`PaneBox flex h-full min-w-[22rem] max-md:flex-[1_1_100%] ${grow ? 'flex-[1_1_100%]' : 'flex-[0_0_0]'} flex-col`}
        >
          {content}
          {childPane && (
            <IsChildPaneContext.Provider value={true}>
              <ChildPaneSwitch pane={childPane} />
            </IsChildPaneContext.Provider>
          )}
        </div>
      </PaneSizeContext.Provider>
    </BannerContext.Provider>
  );
};
