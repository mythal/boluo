import { type MemberWithUser } from '@boluo/api';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { type FC, type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { type PreviewItem } from '../../state/channel.types';
import { type ComposeState } from '../../state/compose.reducer';
import { MessageMedia } from './MessageMedia';
import { PreviewBox } from '@boluo/ui/chat/PreviewBox';
import { RemoveMediaButton } from './RemoveMediaButton';
import { SelfPreviewContent } from './SelfPreviewContent';
import { SelfPreviewNameCell } from './SelfPreviewNameCell';
import { SelfPreviewToolbar } from './SelfPreviewToolbar';
import { useMessageColor } from '../../hooks/useMessageColor';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { NameEditable } from './NameEditable';
import { DisableDelay } from '@boluo/ui/Delay';
import { useSelfPreviewAutoHide } from '../../hooks/useSelfPreviewAutoHide';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';
import { useSortable } from '@dnd-kit/sortable';
import { useScrollerRef } from '../../hooks/useScrollerRef';
import { useVirtuosoRef } from '../../hooks/useVirtuosoRef';
import { useMember } from '../../hooks/useMember';
import { useChannelCharacter } from '../../hooks/useChannelCharacter';
import { usePortrayableCharacters } from '../../hooks/usePortrayableCharacters';
import { resolveSpeaker } from '../../characters/resolveSpeaker';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';

type ComposeStateForSelfPreview = Pick<ComposeState, 'media' | 'originalMessageAttribution'> & {
  editMode: boolean;
};

const isEqual = (a: ComposeStateForSelfPreview, b: ComposeStateForSelfPreview) =>
  a.editMode === b.editMode &&
  a.media === b.media &&
  a.originalMessageAttribution === b.originalMessageAttribution;

const selector = ({
  edit,
  originalMessageAttribution,
  media,
}: ComposeState): ComposeStateForSelfPreview => {
  const editMode = edit != null;
  return { editMode, originalMessageAttribution, media };
};

// Keep the self preview fully visible when its own height or the scroller height changes.
const useSelfPreviewVisibility = (
  displayIndex: number | null | undefined,
  visibilityKey: string,
  boxRef: RefObject<HTMLDivElement | null>,
) => {
  const scrollerRef = useScrollerRef();
  const virtuosoRef = useVirtuosoRef();
  const isVisibleRef = useRef(false);

  const ensureFullyVisible = useCallback(() => {
    if (displayIndex == null) return;
    const element = boxRef.current;
    const scroller = scrollerRef.current;
    const virtuoso = virtuosoRef.current;
    if (!element || !scroller || !virtuoso) return;

    const rect = element.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const intersects = rect.bottom > scrollerRect.top && rect.top < scrollerRect.bottom;
    if (!intersects) return;

    const fullyVisible = rect.top >= scrollerRect.top && rect.bottom <= scrollerRect.bottom;
    if (fullyVisible) return;

    virtuoso.scrollIntoView({ index: displayIndex, behavior: 'auto' });
  }, [boxRef, displayIndex, scrollerRef, virtuosoRef]);

  useEffect(() => {
    let frame: number | null = null;
    let cleanup: (() => void) | null = null;
    isVisibleRef.current = false;

    const setup = () => {
      const element = boxRef.current;
      const scroller = scrollerRef.current;
      if (!element || !scroller) {
        frame = window.requestAnimationFrame(setup);
        return;
      }

      const sizeRef = {
        selfHeight: element.getBoundingClientRect().height,
        scrollerHeight: scroller.getBoundingClientRect().height,
      };

      const resizeObserver = new ResizeObserver((entries) => {
        let changed = false;
        for (const entry of entries) {
          if (entry.target === element) {
            const next = entry.contentRect.height;
            if (Math.round(next) !== Math.round(sizeRef.selfHeight)) {
              sizeRef.selfHeight = next;
              changed = true;
            }
          } else if (entry.target === scroller) {
            const next = entry.contentRect.height;
            if (Math.round(next) !== Math.round(sizeRef.scrollerHeight)) {
              sizeRef.scrollerHeight = next;
              changed = true;
            }
          }
        }
        if (changed) {
          if (isVisibleRef.current) {
            ensureFullyVisible();
          }
        }
      });

      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target === element) {
              isVisibleRef.current = entry.isIntersecting && entry.intersectionRatio > 0;
            }
          }
        },
        { root: scroller, threshold: [0, 0.01, 0.5, 0.99] },
      );

      resizeObserver.observe(element);
      resizeObserver.observe(scroller);
      intersectionObserver.observe(element);
      cleanup = () => {
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
      };
    };

    setup();
    return () => {
      if (frame != null) {
        window.cancelAnimationFrame(frame);
      }
      cleanup?.();
    };
  }, [boxRef, ensureFullyVisible, scrollerRef, visibilityKey]);
};

interface Props {
  preview: PreviewItem;
  isLast: boolean;
  displayIndex?: number;
}

export const SelfPreview: FC<Props> = ({ preview, isLast, displayIndex }) => {
  const isFocused = usePaneIsFocus();
  const member = useMember()!;
  const isMaster = member.channel.isMaster;
  const { composeAtom, inGameAtom, isActionAtom, parsedAtom, selfPreviewHoverAtom } =
    useChannelAtoms();
  const setSelfPreviewHover = useSetAtom(selfPreviewHoverAtom);
  const { hidePlaceholder, hideToolbox } = useSelfPreviewAutoHide();
  const compose: ComposeStateForSelfPreview = useAtomValue(
    useMemo(() => selectAtom(composeAtom, selector, isEqual), [composeAtom]),
  );
  const isAction = useAtomValue(isActionAtom);
  const defaultInGame = useDefaultInGame();
  const parsed = useAtomValue(parsedAtom);
  const composeInGame = useAtomValue(inGameAtom);
  const { resolve } = usePortrayableCharacters(member.space.spaceId);
  const { originalMessageAttribution, editMode, media } = compose;
  const { character, name: channelCharacterName } = useChannelCharacter(member, composeInGame);
  const { speaker } = resolveSpeaker({
    nickname: member.user.nickname,
    defaultInGame,
    parsedInGame: parsed.inGame,
    asTarget: parsed.asTarget,
    originalMessageAttribution,
    channelCharacterId: member.channel.characterId,
    channelCharacterName,
    channelCharacter: character,
    resolveCharacter: resolve,
  });
  const inGame = speaker.inGame;
  const messageColor = speaker.color;
  const colorSeed = speaker.characterId;
  const color = useMessageColor(member.user.id, inGame, messageColor, colorSeed);
  const name = speaker.name;
  const portraitCharacterId =
    speaker.source === 'Character' || speaker.source === 'Editing' ? speaker.characterId : null;
  const originalPortraitId = speaker.source === 'Editing' ? speaker.portraitId : null;
  const nameNode = useMemo(() => {
    return (
      <NameEditable
        inGame={inGame}
        name={name}
        member={member}
        isMaster={isMaster}
        color={color}
        isPreview
        self
        portraitCharacterId={portraitCharacterId}
        originalPortraitId={originalPortraitId}
      />
    );
  }, [color, inGame, isMaster, member, name, originalPortraitId, portraitCharacterId]);
  const { onDrop } = useMediaDrop();
  const mediaNode = useMemo(() => {
    if (media == null) return null;
    return (
      <MessageMedia media={media} className="relative w-fit py-2">
        <div className="absolute top-3 right-1">
          <RemoveMediaButton />
        </div>
      </MessageMedia>
    );
  }, [media]);

  const toolbar = useMemo(
    () => (
      <div
        className={`h-6 pt-1 transition-opacity duration-2000 ${
          hideToolbox ? 'opacity-40' : 'opacity-100'
        }`}
      >
        {isFocused && <SelfPreviewToolbar currentUser={member.user} />}
      </div>
    ),
    [hideToolbox, isFocused, member.user],
  );
  const readObserve = useReadObserve();
  const isInGameChannel = useIsInGameChannel();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const visibilityKey = `${preview.id}:${preview.edit?.time ?? 'preview'}:${preview.posP}/${preview.posQ}`;
  useSelfPreviewVisibility(displayIndex, visibilityKey, boxRef);
  useEffect(() => {
    if (boxRef.current == null) return;
    return readObserve(boxRef.current);
  }, [readObserve]);
  useEffect(
    () => () => {
      setSelfPreviewHover(false);
    },
    [setSelfPreviewHover],
  );
  const { setNodeRef, transform, transition } = useSortable({ id: preview.id, disabled: true });

  return (
    <DisableDelay.Provider value={isFocused}>
      <PreviewBox
        className="relative"
        isLast={isLast}
        id={preview.id}
        inGame={inGame}
        inEditMode={editMode}
        isSelf
        onDrop={onDrop}
        pos={preview.pos}
        isInGameChannel={isInGameChannel}
        transform={transform}
        transition={transition}
        onMouseEnter={() => setSelfPreviewHover(true)}
        onMouseLeave={() => setSelfPreviewHover(false)}
        ref={(ref) => {
          setNodeRef(ref);
          boxRef.current = ref;
        }}
      >
        <SelfPreviewNameCell isAction={isAction} nameNode={nameNode} />
        <div>
          <SelfPreviewContent
            myMember={member.channel}
            nameNode={nameNode}
            mediaNode={mediaNode}
            hidePlaceholder={hidePlaceholder}
          />
          {toolbar}
        </div>
      </PreviewBox>
    </DisableDelay.Provider>
  );
};
