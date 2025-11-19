import { MessageSquareText } from '@boluo/icons';
import { useEffect, useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { offset, shift, useFloating, useHover, useInteractions } from '@floating-ui/react';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { type ChannelHeaderState } from './ChannelHeader';
import { PrimitiveAtom, useAtom } from 'jotai';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
  name: string | null | undefined;
  topic?: string | null | undefined;
  isPublic?: boolean | null | undefined;
}

export const ChannelName: FC<Props> = ({ stateAtom, name, topic, isPublic = true }) => {
  const [showTopic, setShowTopic] = useState(false);
  const hasTopic = topic != null && topic.trim() !== '';
  const [headerState, setHeaderState] = useAtom(stateAtom);
  const { refs, floatingStyles, context } = useFloating({
    open: showTopic,
    onOpenChange: setShowTopic,
    middleware: [shift({ padding: 4 }), offset({ mainAxis: 4 })],
    placement: 'bottom-start',
  });
  useEffect(() => {
    setShowTopic(false);
  }, [headerState]);
  const hover = useHover(context, { enabled: hasTopic && headerState !== 'TOPIC', move: false });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);
  const handleClick = () => {
    if (hasTopic) {
      setHeaderState(headerState === 'TOPIC' ? 'DEFAULT' : 'TOPIC');
    }
  };
  if (!name) {
    return <span>...</span>;
  }
  return (
    <>
      <button
        className={hasTopic ? 'cursor-pointer' : ''}
        ref={refs.setReference}
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
        {name}
        {hasTopic ? (
          <span className={headerState === 'TOPIC' ? '' : 'opacity-45'}>
            {' '}
            <Icon icon={MessageSquareText} />
          </span>
        ) : null}
      </button>
      <TooltipBox
        defaultStyle
        show={showTopic && headerState !== 'TOPIC'}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
      >
        <div className="whitespace-pre">{topic}</div>
      </TooltipBox>
    </>
  );
};
