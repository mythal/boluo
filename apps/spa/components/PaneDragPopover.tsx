import { useContext, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { SizeLevelContext } from '../state/pane-size';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import ChevronDown from '@boluo/icons/ChevronDown';
import ChevronUp from '@boluo/icons/ChevronUp';
import { selectAtom } from 'jotai/utils';
import { panesAtom } from '../state/view.atoms';
import { PaneContext } from '../state/view.context';
import { type ChildPaneRatio } from '../state/view.types';

interface Props {
  isChild?: boolean;
}

const CHILD_RATIOS: ChildPaneRatio[] = ['1/3', '1/2', '2/3'];

export const PaneDragPopover = ({ isChild }: Props) => {
  const sizeLevelAtom = useContext(SizeLevelContext);
  const [sizeLevel, setSizeLevel] = useAtom(sizeLevelAtom);
  const { key: paneKey } = useContext(PaneContext);
  const setPanes = useSetAtom(panesAtom);
  const childRatioAtom = useMemo(
    () =>
      selectAtom(panesAtom, (panes) => {
        if (paneKey == null) return null;
        const pane = panes.find((item) => item.key === paneKey);
        return pane?.child?.ratio ?? null;
      }),
    [paneKey],
  );
  const childRatio = useAtomValue(childRatioAtom);

  const updateChildRatio = (direction: -1 | 1) => {
    if (paneKey == null) return;
    setPanes((prev) => {
      const index = prev.findIndex((pane) => pane.key === paneKey);
      if (index === -1) return prev;
      const pane = prev[index]!;
      const child = pane.child;
      if (!child) return prev;
      const currentIndex = CHILD_RATIOS.indexOf(child.ratio);
      if (currentIndex === -1) return prev;
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), CHILD_RATIOS.length - 1);
      if (nextIndex === currentIndex) return prev;
      const nextPanes = [...prev];
      nextPanes[index] = { ...pane, child: { ...child, ratio: CHILD_RATIOS[nextIndex]! } };
      return nextPanes;
    });
  };
  return (
    <div>
      <div className="font-bold">
        {isChild ? (
          <FormattedMessage defaultMessage="Drag to Move Child Pane" />
        ) : (
          <FormattedMessage defaultMessage="Drag to Move Column" />
        )}
      </div>
      <div>
        <div className="pt-4 pb-2">
          <FormattedMessage defaultMessage="Adjust Size" />
        </div>
        {isChild ? (
          <div className="flex gap-1">
            <span className="grow">{childRatio ?? '-'}</span>
            <ButtonInline className="w-6" onClick={() => updateChildRatio(1)}>
              <ChevronUp />
            </ButtonInline>
            <ButtonInline className="w-6" onClick={() => updateChildRatio(-1)}>
              <ChevronDown />
            </ButtonInline>
          </div>
        ) : (
          <div className="flex gap-1">
            <span className="grow">{sizeLevel}</span>
            <ButtonInline className="w-6" onClick={() => setSizeLevel(0)}>
              0
            </ButtonInline>
            <ButtonInline className="w-6" onClick={() => setSizeLevel(sizeLevel - 1)}>
              -
            </ButtonInline>
            <ButtonInline className="w-6" onClick={() => setSizeLevel(sizeLevel + 1)}>
              +
            </ButtonInline>
          </div>
        )}
      </div>
    </div>
  );
};
