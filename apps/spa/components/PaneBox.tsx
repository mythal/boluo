import { type FC, type ReactNode, Suspense, useContext, useMemo, useRef } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { type ChildrenProps } from '@boluo/utils';
import { usePaneFocus } from '../hooks/usePaneFocus';
import { Delay } from './Delay';
import { PaneBodyError } from './PaneBodyError';
import { BannerContext } from '../hooks/useBannerNode';
import { selectAtom } from 'jotai/utils';
import { PaneContext } from '../state/view.context';
import { panesAtom } from '../state/view.atoms';
import { type PaneData } from '../state/view.types';
import { useAtomValue } from 'jotai';
import { IsChildPaneContext, useIsChildPane } from '../hooks/useIsChildPane';
import { ChildPaneSwitch } from './PaneSwitch';

interface Props extends ChildrenProps {
  header?: ReactNode;
  grow?: boolean;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

export const PaneBox: FC<Props> = ({ header, children, grow = false }) => {
  const { key: paneKey } = useContext(PaneContext);
  const paneBoxRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const focus = usePaneFocus(paneBoxRef);
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
      ref={isChildPane ? paneBoxRef : undefined}
      onClick={focus}
      className="@container relative flex h-full min-h-0 flex-[1_1_100%] flex-col"
    >
      {isChildPane && <div className="bg-pane-header-border absolute top-0 h-px w-full" />}
      {header}
      <div ref={bannerRef} className="border-pane-header-border border-b"></div>

      <div
        onFocus={focus}
        className="bg-pane-bg relative flex-grow overflow-y-auto overflow-x-hidden"
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
    <BannerContext value={bannerRef}>
      <div
        ref={paneBoxRef}
        className={`PaneBox flex h-full min-w-[22rem] max-md:flex-[1_1_100%] ${grow ? 'flex-[1_1_100%]' : 'flex-[0_0_0]'} flex-col`}
      >
        {content}
        {childPane && (
          <IsChildPaneContext value={true}>
            <ChildPaneSwitch pane={childPane} />
          </IsChildPaneContext>
        )}
      </div>
    </BannerContext>
  );
};
