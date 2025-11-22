import {
  type CSSProperties,
  type FC,
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Loading } from '@boluo/ui/Loading';
import { type ChildrenProps } from '@boluo/utils/types';
import { usePaneFocus } from '../hooks/usePaneFocus';
import { Delay } from '@boluo/ui/Delay';
import { PaneBodyError } from './PaneBodyError';
import { BannerContext } from '../hooks/useBannerNode';
import { selectAtom } from 'jotai/utils';
import { PaneContext } from '../state/view.context';
import { panesAtom } from '../state/view.atoms';
import { type ChildPaneRatio, type PaneChild } from '../state/view.types';
import { useAtomValue } from 'jotai';
import { IsChildPaneContext, useIsChildPane } from '../hooks/useIsChildPane';
import { ChildPaneSwitch } from './PaneSwitch';
import { usePaneDrag } from '../hooks/usePaneDrag';

interface Props extends ChildrenProps {
  header?: ReactNode;
  grow?: boolean;
}

const Placeholder = () => {
  return <div className="h-full"></div>;
};

const CHILD_RATIO_FRACTIONS: Record<ChildPaneRatio, [number, number]> = {
  '1/2': [1, 1],
  '2/3': [1, 2],
  '1/3': [2, 1],
};

const getChildGridStyle = (ratio: ChildPaneRatio): CSSProperties => {
  const [parentFraction, childFraction] = CHILD_RATIO_FRACTIONS[ratio];
  return {
    gridTemplateRows: `minmax(0, ${parentFraction}fr) minmax(0, ${childFraction}fr)`,
  };
};

export const PaneBox: FC<Props> = ({ header, children, grow = false }) => {
  const { key: paneKey, focused } = useContext(PaneContext);
  const paneBoxRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const focus = usePaneFocus(paneBoxRef);
  const isChildPane = useIsChildPane();
  const { registerPaneRef } = usePaneDrag();
  const childPaneAtom = useMemo(
    () =>
      selectAtom(panesAtom, (panes): PaneChild | undefined => {
        if (isChildPane) {
          return undefined;
        }
        const pane = panes.find((pane) => pane.key === paneKey);
        return pane?.child;
      }),
    [isChildPane, paneKey],
  );
  const childPane: PaneChild | undefined = useAtomValue(childPaneAtom);
  const childPaneGridStyle = useMemo(() => {
    if (!childPane) {
      return { gridTemplateRows: 'minmax(0, 1fr)' };
    }
    return getChildGridStyle(childPane.ratio);
  }, [childPane]);

  useEffect(() => {
    if (!registerPaneRef || isChildPane || paneKey == null) return;
    registerPaneRef(paneKey, paneBoxRef.current);
    return () => registerPaneRef(paneKey, null);
  }, [isChildPane, paneKey, registerPaneRef]);
  const content = (
    <div
      ref={isChildPane ? paneBoxRef : undefined}
      onClick={focus}
      className="@container relative flex h-full min-h-0 flex-[1_1_100%] flex-col"
    >
      {isChildPane && <div className="bg-pane-header-border absolute top-0 h-px w-full" />}
      {header}
      <div
        ref={bannerRef}
        className={`${focused ? 'border-border-default' : 'border-border-subtle'} border-b`}
      ></div>

      <div onFocus={focus} className="bg-pane-bg relative grow overflow-x-hidden overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loading />
            </div>
          }
        >
          <PaneBodyError>
            <Delay fallback={<Placeholder />}>{children}</Delay>
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
        className={`PaneBox flex h-full min-w-88 max-md:flex-[1_1_100%] ${grow ? 'flex-[1_1_100%]' : 'flex-[0_0_0]'} flex-col`}
      >
        <div className="grid h-full min-h-0 grid-cols-1" style={childPaneGridStyle}>
          <div className="min-h-0 overflow-hidden">{content}</div>
          {childPane && (
            <IsChildPaneContext value={true}>
              <div className="min-h-0 overflow-hidden">
                <ChildPaneSwitch pane={childPane.pane} />
              </div>
            </IsChildPaneContext>
          )}
        </div>
      </div>
    </BannerContext>
  );
};
