import MessageSquareText from '@boluo/icons/MessageSquareText';
import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { offset, shift, useFloating, useHover, useInteractions } from '@floating-ui/react';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { type ChannelHeaderState } from './ChannelHeader';
import { type PrimitiveAtom, useAtom } from 'jotai';
import clsx from 'clsx';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
  name: string | null | undefined;
  topic?: string | null | undefined;
  isPublic?: boolean | null | undefined;
}

export const ChannelName: FC<Props> = ({ stateAtom, name, topic, isPublic = true }) => {
  const [showTopic, setShowTopic] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const hasTopic = topic != null && topic.trim() !== '';
  const topicRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [headerState, setHeaderState] = useAtom(stateAtom);
  const { refs, floatingStyles, context } = useFloating({
    open: showTopic,
    onOpenChange: setShowTopic,
    middleware: [shift({ padding: 4 }), offset({ mainAxis: 4 })],
    placement: 'bottom-start',
  });
  const { setReference, setFloating } = useFloatingSetters(refs);

  const checkTruncated = useCallback(() => {
    const element = topicRef.current;
    if (element) {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    }
  }, []);

  const [prevHeaderState, setPrevHeaderState] = useState(headerState);
  if (prevHeaderState !== headerState) {
    setPrevHeaderState(headerState);
    setShowTopic(false);
  }

  useEffect(() => {
    checkTruncated();
  }, [headerState, topic, checkTruncated]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        checkTruncated();
      }, 500);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [checkTruncated]);

  const hover = useHover(context, {
    enabled: hasTopic && headerState !== 'TOPIC' && isTruncated,
    move: false,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
  const handleClick = () => {
    setHeaderState(headerState === 'TOPIC' ? 'DEFAULT' : 'TOPIC');
  };
  if (!name) {
    return <span>...</span>;
  }
  return (
    <div className="flex min-w-0 items-center" ref={containerRef}>
      <button
        className="shrink-0 cursor-pointer"
        ref={setReference}
        {...getReferenceProps()}
        onClick={handleClick}
      >
        {!isPublic ? (
          <span className="text-text-muted mr-1">
            [<FormattedMessage defaultMessage="Secret" />]
          </span>
        ) : (
          ''
        )}
        <span className="text-lg font-semibold">{name}</span>
        {hasTopic ? (
          <span className={clsx(headerState === 'TOPIC' ? '' : 'opacity-45', 'mx-1')}>
            <Icon icon={MessageSquareText} />
          </span>
        ) : null}
      </button>
      {hasTopic && headerState !== 'TOPIC' && (
        <span ref={topicRef} className="truncate opacity-75">
          {topic}
        </span>
      )}
      <TooltipBox
        defaultStyle
        show={showTopic && headerState !== 'TOPIC'}
        style={floatingStyles}
        ref={setFloating}
        {...getFloatingProps()}
      >
        <div className="max-w-sm whitespace-pre-line">{topic}</div>
      </TooltipBox>
    </div>
  );
};
