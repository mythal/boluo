import { Member } from '@boluo/api';
import { Atom, atom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { VisibilityAtom, useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { PreviewItem } from '../../state/channel.types';
import { ComposeState } from '../../state/compose.reducer';
import { MessageMedia } from './MessageMedia';
import { RemoveMediaButton } from './RemoveMediaButton';
import { SelfPreviewNameCell } from './SelfPreviewNameCell';
import { useMessageColor } from '../../hooks/useMessageColor';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { NameEditable } from './NameEditable';
import { CursorContext, CursorState } from '../entities/TextWithCursor';
import { SelfPreviewVisibilitySwitch } from './SelfPreviewVisibilitySwitch';
import { Delay } from '../Delay';
import { Content } from './Content';
import { CSS } from '@dnd-kit/utilities';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useSortable } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { usePaneSize } from '../../hooks/usePaneSize';
import { ToggleActionButton } from './ToggleActionButton';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { IsActionIndicator } from './IsActionIndicator';
import Icon from '@boluo/ui/Icon';
import { ChevronDown, TowerBroadcast, MegaphoneOff, Whisper, X } from '@boluo/icons';
import { FloatingPortal, autoUpdate, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { ComposeAtom } from '../../hooks/useComposeAtom';
import { FormattedMessage } from 'react-intl';
import { ZERO_WIDTH_SPACE } from '../../const';

type ComposeDrived = Pick<ComposeState, 'media'> & {
  editMode: boolean;
  name: string;
};

const isEqual = (a: ComposeDrived, b: ComposeDrived) =>
  a.editMode === b.editMode && a.name === b.name && a.media === b.media;

const selector = ({ inputedName, source, editFor, media }: ComposeState): ComposeDrived => {
  const editMode = editFor !== null;
  return { name: inputedName.trim(), editMode, media };
};

interface Props {
  preview: PreviewItem;
  myMember: Member;
  theme: 'light' | 'dark';
  isLast: boolean;
}

export const SelfPreview: FC<Props> = ({ preview, myMember: member, theme, isLast }) => {
  const readObserve = useReadObserve();
  const defaultInGame = useDefaultInGame();
  const paneSize = usePaneSize();
  const boxRef = useRef<HTMLDivElement | null>();
  useEffect(() => {
    if (boxRef.current == null) return;
    return readObserve(boxRef.current);
  }, [readObserve]);
  const { setNodeRef, transform, transition } = useSortable({ id: preview.key, disabled: true });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isFocused = usePaneIsFocus();
  const isMaster = member.channel.isMaster;
  const { composeAtom, parsedAtom, visibilityAtom } = useChannelAtoms();
  const compose: ComposeDrived = useAtomValue(useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]));
  const parsed = useAtomValue(parsedAtom);
  const cursorState: CursorState = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ source, range }) => ({ range: range, self: true })), [composeAtom]),
  );
  const cursorAtom = useMemo(() => atom<HTMLElement | null>(null), []);
  const deferredParsed = useDeferredValue(parsed);
  const inGame = deferredParsed.inGame ?? defaultInGame;
  const isAction = deferredParsed.isAction;
  const inlineSwitch = useMemo(
    () => (
      <Delay fallback={<div className="inline-block h-6">{ZERO_WIDTH_SPACE}</div>}>
        <SelfPreviewVisibilitySwitch paneSize={paneSize} />
      </Delay>
    ),
    [paneSize],
  );

  const { media } = compose;

  const color = useMessageColor(theme, member.user, inGame, null);
  const name = useMemo(() => {
    if (!inGame) {
      return member.user.nickname;
    } else if (compose.name !== '') {
      return compose.name;
    }
    return member.channel.characterName;
  }, [compose.name, inGame, member.channel.characterName, member.user.nickname]);
  const nameNode = useMemo(() => {
    return (
      <NameEditable inGame={inGame} name={name} member={member} isMaster={isMaster} color={color} isPreview self />
    );
  }, [color, inGame, isMaster, member, name]);
  const { onDrop } = useMediaDrop();
  const mediaNode = useMemo(() => {
    if (media == null) return null;
    return (
      <MessageMedia media={media} className="relative w-fit py-2">
        <div className="absolute right-full top-2 -translate-x-1">
          <RemoveMediaButton />
        </div>
      </MessageMedia>
    );
  }, [media]);
  const visibilityMenu = useMemo(
    () => <VisibilityMenu visibilityAtom={visibilityAtom} composeAtom={composeAtom} />,
    [composeAtom, visibilityAtom],
  );

  const content = useMemo(
    () => (
      <CursorContext.Provider value={cursorState}>
        <Content
          channelId={member.channel.channelId}
          source={deferredParsed.text}
          entities={deferredParsed.entities}
          isAction={deferredParsed.isAction}
          isArchived={false}
          nameNode={nameNode}
          startNode={deferredParsed.entities.length === 0 ? inlineSwitch : null}
          self
          isPreview
          cursorAtom={cursorAtom}
          isFocused={isFocused}
        />
      </CursorContext.Provider>
    ),
    [
      cursorAtom,
      cursorState,
      deferredParsed.entities,
      deferredParsed.isAction,
      deferredParsed.text,
      inlineSwitch,
      isFocused,
      member.channel.channelId,
      nameNode,
    ],
  );

  if (paneSize === 'SMALL') {
    return (
      <div
        data-id={preview.key}
        data-is-last={isLast}
        data-in-game={inGame}
        className={clsx(
          'group grid grid-flow-col grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
          'grid-cols-[4rem_minmax(0,1fr)]',
          'data-[in-game=true]:bg-preview-in-bg data-[in-game=false]:bg-preview-out-bg',
          'bg-[radial-gradient(var(--colors-preview-hint)_1px,_transparent_1px)] bg-[length:10px_10px]',
        )}
        ref={(ref) => {
          setNodeRef(ref);
          boxRef.current = ref;
        }}
        style={style}
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <div className="h-full self-end justify-self-end">
          <ToggleActionButton isAction={isAction} />
        </div>
        <div className="col-start-1 row-start-2 row-end-2"></div>

        <div className="flex items-center justify-between gap-x-4 gap-y-1 pb-2">
          <div className="flex-shrink-1 relative max-w-full flex-grow overflow-hidden text-nowrap rounded-sm">
            {!isAction ? (
              <>{nameNode}:</>
            ) : (
              <div className="">
                <IsActionIndicator />
              </div>
            )}
          </div>
          {visibilityMenu}
        </div>
        <div>
          <div className="items-between relative flex h-full min-h-8 flex-col gap-1">
            {content}
            {mediaNode}
          </div>

          {/* <div className="h-6">{isFocused && <SelfPreviewToolbar currentUser={member.user} />}</div> */}
        </div>
      </div>
    );
  }

  return (
    <div
      data-id={preview.key}
      data-is-last={isLast}
      data-in-game={inGame}
      className={clsx(
        'group grid grid-flow-row grid-cols-[4rem_12rem_minmax(0,1fr),4rem] grid-rows-[auto_auto] items-start gap-x-2 gap-y-1 px-2 py-2',
        'data-[in-game=true]:bg-preview-in-bg data-[in-game=false]:bg-preview-out-bg',
        'bg-[radial-gradient(var(--colors-preview-hint)_1px,_transparent_1px)] bg-[length:10px_10px]',
      )}
      ref={(ref) => {
        setNodeRef(ref);
        boxRef.current = ref;
      }}
      style={style}
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <div className="row-span-full justify-self-end">
        <ToggleActionButton isAction={isAction} />
      </div>
      <SelfPreviewNameCell isAction={isAction} nameNode={nameNode} paneSize={paneSize} />

      <div>
        <div className="items-between  relative flex h-full min-h-8 flex-col gap-1">
          {content}
          {mediaNode}
        </div>

        {/* <div className="h-6">{isFocused && <SelfPreviewToolbar currentUser={member.user} />}</div> */}
      </div>
      <div className="flex justify-end">{visibilityMenu}</div>
    </div>
  );
};

const VisibilityMenu: FC<{ visibilityAtom: VisibilityAtom; composeAtom: ComposeAtom }> = ({
  visibilityAtom,
  composeAtom,
}) => {
  const dispatch = useSetAtom(composeAtom);
  const visibility = useAtomValue(visibilityAtom);
  const [isOpen, setIsOpen] = useState(false);
  const { refs, context, floatingStyles, update } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top-end',
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  return (
    <>
      <button
        className="group/btn bg-preview-button-bg hover:bg-preview-button-hover-bg flex items-center rounded-sm px-1"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {visibility === 'WHISPER' && <span className="text-text-lighter text-xs">(4)</span>}
        <Icon
          className={`text-text-light group-hover/btn:text-brand-600 h-4 w-4 ${isOpen ? 'text-brand-600' : ''}`}
          icon={visibility === 'BROADCAST' ? TowerBroadcast : visibility === 'MUTE' ? MegaphoneOff : Whisper}
        />
        <Icon
          className={`text-text-base h-4 w-4 transition-transform  ${isOpen ? '-rotate-180' : 'rotate-0'}`}
          icon={ChevronDown}
        />
      </button>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-card-bg border-card-border shadow-1/2 shadow-card-shadow grid h-max w-max grid-cols-[auto_auto] rounded-sm border text-base"
          >
            {visibility === 'WHISPER' && <div className="font-pixel h-full w-56 p-2">Placeholder</div>}
            <div>
              <VisibilityMenuItem
                active={visibility === 'BROADCAST'}
                label="Broadcast"
                icon={TowerBroadcast}
                onClick={() => dispatch({ type: 'setVisibility', payload: { visibility: 'BROADCAST' } })}
                description={<FormattedMessage defaultMessage="Other WILL see what you're typing." />}
              />
              <VisibilityMenuItem
                active={visibility === 'MUTE'}
                label="Mute"
                icon={MegaphoneOff}
                onClick={() => dispatch({ type: 'setVisibility', payload: { visibility: 'MUTE' } })}
                description={<FormattedMessage defaultMessage="Other can't see what you're typing." />}
              />
              <VisibilityMenuItem
                active={visibility === 'WHISPER'}
                label="Whisper"
                icon={Whisper}
                onClick={() => dispatch({ type: 'setVisibility', payload: { visibility: 'WHISPER' } })}
                description={<FormattedMessage defaultMessage="Only visible to certain member." />}
              />
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const VisibilityMenuItem: FC<{
  active: boolean;
  label: ReactNode;
  command?: string;
  description: ReactNode;
  icon: typeof Whisper;
  onClick: () => void;
}> = ({ active, description, label, icon, command, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`grid grid-cols-[1em_10em] gap-x-2 px-4 py-2 text-left ${active ? '' : 'text-text-lighter'}`}
    >
      <Icon icon={icon} className={'self-center'} />
      <span className={active ? '' : ''}>{label}</span>

      <div className={`col-start-2 text-sm ${active ? 'text-text-light' : 'text-text-lighter'}`}>{description}</div>
    </button>
  );
};
