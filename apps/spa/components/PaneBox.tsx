import clsx from 'clsx';
import { FC, ReactNode, Suspense, use, useContext, useMemo, useRef } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { ChildrenProps, StyleProps } from '@boluo/utils';
import { usePaneFocus } from '../hooks/usePaneFocus';
import { usePaneIsFocus } from '../hooks/usePaneIsFocus';
import { Delay } from './Delay';
import { PaneBodyError } from './PaneBodyError';
import { BannerContext } from '../hooks/useBannerNode';
import { selectAtom } from 'jotai/utils';
import { usePaneKey } from '../hooks/usePaneKey';
import { PaneContext } from '../state/view.context';
import { panesAtom } from '../state/view.atoms';
import { PaneData } from '../state/view.types';
import { useAtomValue } from 'jotai';
import { IsChildPaneContext, useIsChildPane } from '../hooks/useIsChildPane';
import { ChildPaneSwitch } from './PaneSwitch';

interface Props extends ChildrenProps {
  header?: ReactNode;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

export const PaneBox: FC<Props> = ({ header, children }) => {
  const { key: paneKey, focused: isFocused } = useContext(PaneContext);
  const focus = usePaneFocus();
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
  const content = (
    <div
      onClick={focus}
      className={
        '@container relative flex h-full min-h-0 flex-[1_1_100%] flex-col'
        // '@container relative flex min-w-[22rem] flex-[1_1_100%] flex-col md:contain-strict',
        // isFocused ? 'max-md:h-0 max-md:flex-[1_1_100%]' : 'max-md:flex-[0_1_0]',
      }
    >
      {isChildPane && <div className="bg-pane-header-border absolute top-0 h-px w-full" />}
      {header}
      <div ref={bannerRef}></div>

      <div className="relative">
        <div className="bg-pane-header-border absolute z-10 h-[2px] w-full"></div>
      </div>

      <div
        onFocus={focus}
        className={clsx(
          'bg-pane-bg relative flex-grow overflow-y-auto overflow-x-hidden',
          isFocused ? '' : 'max-md:hidden',
        )}
      >
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
      <div className="PaneBox flex h-full min-w-[22rem] flex-[1_1_100%] flex-col">
        {content}
        {childPane && (
          <IsChildPaneContext.Provider value={true}>
            <ChildPaneSwitch pane={childPane} />
          </IsChildPaneContext.Provider>
        )}
      </div>
    </BannerContext.Provider>
  );
};
