import SplitHorizontal from '@boluo/icons/SplitHorizontal';
import {
  type FC,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { usePaneSplit } from '../../hooks/usePaneSplit';
import { useChannelId } from '../../hooks/useChannelId';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { CircleIndicator } from '@boluo/ui/CircleIndicator';
import { PaneContext } from '../../state/view.context';
import { panesAtom } from '../../state/view.atoms';
import { type ChildPaneRatio } from '../../state/view.types';
import { useLongPressProgress } from '../../hooks/useLongPressProgress';

const LONG_PRESS_DURATION = 1000;
const SHORT_PRESS_THRESHOLD = 100;
const CHILD_RATIO: ChildPaneRatio = '1/2';

export const ChannelHeaderSplitPaneButton: FC = () => {
  const intl = useIntl();
  const dup = usePaneSplit();
  const channelId = useChannelId();
  const { key: paneKey } = useContext(PaneContext);
  const setPanes = useSetAtom(panesAtom);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressVisualTimeoutRef = useRef<number | null>(null);
  const [longPressStart, setLongPressStart] = useState<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('bottom');
  const hasSameChildPane = useAtomValue(
    useMemo(
      () =>
        atom((get) => {
          if (paneKey == null) return false;
          const pane = get(panesAtom).find((item) => item.key === paneKey);
          const childPane = pane?.child?.pane;
          return childPane?.type === 'CHANNEL' && childPane.channelId === channelId;
        }),
      [channelId, paneKey],
    ),
  );
  const longPressDisabled = hasSameChildPane;
  const showProgress = longPressStart != null;
  const { progress, resetProgress } = useLongPressProgress(
    longPressStart,
    LONG_PRESS_DURATION,
    showProgress,
  );

  const createChildPane = useCallback(() => {
    setPanes((panes) => {
      if (paneKey == null) return panes;
      const index = panes.findIndex((pane) => pane.key === paneKey);
      if (index === -1) return panes;
      const pane = panes[index]!;
      if (pane.child?.pane.type === 'CHANNEL' && pane.child.pane.channelId === channelId) {
        return panes;
      }
      const ratio = pane.child?.ratio ?? CHILD_RATIO;
      const nextPanes = [...panes];
      nextPanes[index] = {
        ...pane,
        child: { pane: { type: 'CHANNEL', channelId }, ratio },
      };
      return nextPanes;
    });
  }, [channelId, paneKey, setPanes]);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current != null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);
  const clearLongPressVisualTimeout = useCallback(() => {
    if (longPressVisualTimeoutRef.current != null) {
      clearTimeout(longPressVisualTimeoutRef.current);
      longPressVisualTimeoutRef.current = null;
    }
  }, []);

  const resetLongPressState = useCallback(
    (keepTrigger = false) => {
      clearLongPressTimeout();
      clearLongPressVisualTimeout();
      resetProgress();
      setLongPressStart(null);
      if (!keepTrigger) {
        longPressTriggeredRef.current = false;
      }
    },
    [clearLongPressTimeout, clearLongPressVisualTimeout, resetProgress],
  );

  const handleLongPress = useCallback(() => {
    clearLongPressTimeout();
    clearLongPressVisualTimeout();
    if (longPressDisabled) return;
    longPressTriggeredRef.current = true;
    resetProgress();
    setLongPressStart(null);
    createChildPane();
  }, [
    clearLongPressTimeout,
    clearLongPressVisualTimeout,
    createChildPane,
    longPressDisabled,
    resetProgress,
  ]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (longPressDisabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      resetLongPressState();
      longPressTriggeredRef.current = false;
      longPressVisualTimeoutRef.current = window.setTimeout(
        () => setLongPressStart(start),
        SHORT_PRESS_THRESHOLD,
      );
      longPressTimeoutRef.current = window.setTimeout(handleLongPress, LONG_PRESS_DURATION);
    },
    [handleLongPress, longPressDisabled, resetLongPressState],
  );

  const handlePointerUp = useCallback(() => {
    resetLongPressState(longPressTriggeredRef.current);
  }, [resetLongPressState]);
  const handlePointerLeave = useCallback(() => {
    resetLongPressState(longPressTriggeredRef.current);
  }, [resetLongPressState]);
  const handlePointerCancel = useCallback(() => {
    resetLongPressState(longPressTriggeredRef.current);
  }, [resetLongPressState]);

  useEffect(
    () => () => {
      resetLongPressState();
    },
    [resetLongPressState],
  );

  useEffect(() => {
    if (longPressDisabled) {
      resetLongPressState();
    }
  }, [longPressDisabled, resetLongPressState]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (longPressTriggeredRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
      const shouldSkip = longPressTriggeredRef.current;
      longPressTriggeredRef.current = false;
      if (shouldSkip) return;
      dup();
    },
    [dup],
  );

  return (
    <div
      className="ChannelHeaderSplitPaneButton inline-flex"
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      <PaneHeaderButton
        onClick={handleClick}
        aria-label={intl.formatMessage({ defaultMessage: 'Split pane' })}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerCancel}
      >
        {showProgress ? (
          <CircleIndicator className="h-4 w-4" progress={progress} />
        ) : (
          <SplitHorizontal className="h-4 w-4" />
        )}
        <span className="sr-only">
          <FormattedMessage defaultMessage="Split" />
        </span>
      </PaneHeaderButton>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        <div className="text-sm">
          <FormattedMessage defaultMessage="Split" />
        </div>
        {!longPressDisabled && (
          <div className="text-tooltip-text-secondary text-sm">
            <FormattedMessage defaultMessage="Long press to vertical split" />
          </div>
        )}
      </TooltipBox>
    </div>
  );
};
