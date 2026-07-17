import { type FC, useDeferredValue, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import Edit from '@boluo/icons/Edit';
import View from '@boluo/icons/View';
import { emptyParseResult, messageToParsed, type ParseResult } from '@boluo/interpreter';
import { type PreviewItem } from '../../state/channel.types';
import { Content } from './Content';
import { Name } from './Name';
import { OthersPreviewNoBroadcast } from './OthersPreviewNoBroadcast';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { PreviewBox } from '@boluo/ui/chat/PreviewBox';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';

interface Props {
  preview: PreviewItem;
  isLast: boolean;
}

const ShowOriginalButton: FC<{ showOriginal: boolean; onToggle: () => void }> = ({
  showOriginal,
  onToggle,
}) => {
  const intl = useIntl();
  const label = intl.formatMessage({ defaultMessage: 'Editing; Show original' });
  const {
    showTooltip,
    setReference,
    setFloating,
    getFloatingProps,
    getReferenceProps,
    floatingStyles,
  } = useTooltip('top-start');
  return (
    <>
      <span ref={setReference} {...getReferenceProps()}>
        <ButtonInline aria-pressed={showOriginal} aria-label={label} onClick={onToggle}>
          <span className="p-0.5">{showOriginal ? <View /> : <Edit />}</span>
        </ButtonInline>
      </span>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        {label}
      </TooltipBox>
    </>
  );
};

export const OthersPreview: FC<Props> = ({ preview, isLast }) => {
  const { isMaster, isAction, name } = preview;
  const [showOriginal, setShowOriginal] = useState(false);
  const original = showOriginal ? preview.original : undefined;

  const parsed: ParseResult = useMemo(() => {
    if (original != null) {
      return messageToParsed(original.text, original.entities);
    }
    const text = preview.text || '';
    const entities = preview.entities;
    return { ...emptyParseResult, text, entities };
  }, [original, preview.text, preview.entities]);

  const nameNode = useMemo(() => {
    return (
      <Name
        inGame={(original != null ? original.inGame : preview.inGame) ?? false}
        name={original != null ? original.name : name}
        isMaster={(original != null ? original.isMaster : isMaster) ?? false}
        userId={preview.senderId}
        isPreview
        self
      />
    );
  }, [original, isMaster, name, preview.inGame, preview.senderId]);

  const { text: source, entities } = useDeferredValue(parsed);
  const isInGameChannel = useIsInGameChannel();
  const displayIsAction = (original != null ? original.isAction : isAction) ?? false;

  const handle =
    preview.original != null ? (
      <ShowOriginalButton
        showOriginal={showOriginal}
        onToggle={() => setShowOriginal((show) => !show)}
      />
    ) : undefined;

  return (
    <PreviewBox
      id={preview.id}
      inEditMode={preview.edit != null}
      isSelf={false}
      inGame={(original != null ? original.inGame : preview.inGame) ?? false}
      isInGameChannel={isInGameChannel}
      isLast={isLast}
      pos={preview.pos}
      disablePreviewStyle={original != null}
      handle={handle}
      className="text-text-secondary pr-message-small compact:pr-message-compact irc:pr-message"
    >
      <div className="irc:text-right">{displayIsAction ? null : <>{nameNode}:</>}</div>
      {original == null && preview.text == null ? (
        <OthersPreviewNoBroadcast timestamp={preview.timestamp} />
      ) : (
        <div>
          <Content
            source={source}
            entities={entities}
            isAction={displayIsAction}
            isArchived={false}
            nameNode={nameNode}
            seed={original?.seed}
          />
        </div>
      )}
    </PreviewBox>
  );
};
