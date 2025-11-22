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
import { isSinglePaneAtom, panesAtom } from '../state/view.atoms';
import { type ChildPaneRatio, type PaneChild } from '../state/view.types';
import { atom, useAtomValue } from 'jotai';
import { IsChildPaneContext, useIsChildPane } from '../hooks/useIsChildPane';
import { ChildPaneSwitch } from './PaneSwitch';
import { usePaneDrag } from '../hooks/usePaneDrag';
import { PaneProvider } from '../state/view.context';
import clsx from 'clsx';
import { SizeLevelContext } from '../state/pane-size';

interface Props extends ChildrenProps {
  header?: ReactNode;
  initSizeLevel?: number | undefined;
  resizeable?: boolean;
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

export const PaneBox: FC<Props> = ({ header, children, initSizeLevel = 0 }) => {
  const { key: paneKey, focused } = useContext(PaneContext);
  const paneBoxRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const sizeLevelAtom = useMemo(() => atom(initSizeLevel), [initSizeLevel]);
  const sizeLevel = useAtomValue(sizeLevelAtom);
  const focus = usePaneFocus(paneBoxRef);
  const isChildPane = useIsChildPane();
  const isSinglePane = useAtomValue(isSinglePaneAtom);
  const { registerPaneRef, draggingPane } = usePaneDrag();
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
  const isDraggingCurrentPane =
    draggingPane != null && draggingPane.key === paneKey && draggingPane.isChild === isChildPane;

  useEffect(() => {
    if (!registerPaneRef || isChildPane || paneKey == null) return;
    registerPaneRef(paneKey, paneBoxRef.current);
    return () => registerPaneRef(paneKey, null);
  }, [isChildPane, paneKey, registerPaneRef]);
  const content = (
    <div
      ref={isChildPane ? paneBoxRef : undefined}
      onClick={focus}
      className={clsx(
        '@container relative flex h-full min-h-0 flex-[1_1_100%] flex-col',
        isDraggingCurrentPane && 'opacity-50',
      )}
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
  const growStyle: CSSProperties = {
    ['--pane-flex-grow' as string]: (1 + sizeLevel * 0.25).toString(),
    ['--min-size' as string]: `${sizeLevel * 5}%`,
  };
  return (
    <BannerContext value={bannerRef}>
      <SizeLevelContext.Provider value={sizeLevelAtom}>
        <div
          ref={paneBoxRef}
          style={growStyle}
          className={clsx(
            'PaneBox flex h-full flex-[0_0_0] flex-col max-md:flex-[1_1_100%]',
            isSinglePane
              ? 'md:flex-[1_1_100%]'
              : 'md:min-w-[max(calc(40%+var(--min-size,0)),375px)] md:flex-[var(--pane-flex-grow,1)_1] lg:min-w-[max(calc(33%+var(--min-size,0)),375px)] xl:min-w-[max(calc(22%+var(--min-size,0)),375px)]',
          )}
        >
          <div className="grid h-full min-h-0 grid-cols-1" style={childPaneGridStyle}>
            <div className="min-h-0 overflow-hidden">{content}</div>
            {childPane && paneKey != null && (
              <IsChildPaneContext value={true}>
                <div className="min-h-0 overflow-hidden">
                  <PaneProvider paneKey={paneKey} isChild>
                    <ChildPaneSwitch pane={childPane.pane} />
                  </PaneProvider>
                </div>
              </IsChildPaneContext>
            )}
          </div>
        </div>
      </SizeLevelContext.Provider>
    </BannerContext>
  );
};
