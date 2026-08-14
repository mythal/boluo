import clsx from 'clsx';
import ChevronDown from '@boluo/icons/ChevronDown';
import TriangleAlert from '@boluo/icons/TriangleAlert';
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { NameBox } from '@boluo/ui/chat/NameBox';
import { NameEditContent } from './NameEditContent';
import { SelectedCharacterPortraitPreview } from './SelectedCharacterPortraitPreview';
import { type MemberWithUser } from '@boluo/api';
import Icon from '@boluo/ui/Icon';
import { Delay } from '@boluo/ui/Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { atom, useAtom, useAtomValue, useStore } from 'jotai';
import { useVirtualKeybroadChange } from '../../hooks/useVirtualKeybroadChange';
import { CharacterPopover } from './CharacterPopover';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  color: string;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  member: MemberWithUser;
  portraitCharacterId: string | null;
}

export const NameEditable: FC<Props> = ({ name, inGame, color, member, portraitCharacterId }) => {
  const theme = useResolvedTheme();
  const store = useStore();
  const { composeFocusedAtom, selfPreviewNamePanelOpenAtom, isComposeEmptyAtom } =
    useChannelAtoms();
  const [isOpen, setIsOpen] = useAtom(selfPreviewNamePanelOpenAtom);
  const [content, setContent] = useState<'name' | 'characters'>('name');
  const isEmptyName = name === '' || name == null;
  const shouldForceOpenAtom = useMemo(
    () =>
      atom((get) => {
        const isComposeEmpty = get(isComposeEmptyAtom);
        const composeFocused = get(composeFocusedAtom);
        return inGame && isEmptyName && !isComposeEmpty && composeFocused;
      }),
    [composeFocusedAtom, inGame, isComposeEmptyAtom, isEmptyName],
  );

  useEffect(() => {
    return store.sub(shouldForceOpenAtom, () => {
      const shouldForceOpen = store.get(shouldForceOpenAtom);
      if (shouldForceOpen) setIsOpen(true);
    });
  }, [store, shouldForceOpenAtom, setIsOpen]);

  const icon: ReactNode = useMemo(() => {
    return (
      <Icon
        icon={ChevronDown}
        className={clsx(
          'text inline-block h-[1em] w-[1em] transition-all duration-100',
          isOpen ? 'rotate-180' : 'text-text-muted',
        )}
      />
    );
  }, [isOpen]);

  const { refs, floatingStyles, context, update } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      setIsOpen(open);
      if (!open) setContent('name');
    },
    placement: 'top-end',
    // The hide middleware will cause the keyboard flickering in Android
    middleware: [
      flip({ mainAxis: true, crossAxis: false }),
      shift(),
      offset({ mainAxis: 0, crossAxis: 0 }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);

  useVirtualKeybroadChange(update);

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <NameBox
        interactive
        pressed={isOpen}
        color={color}
        theme={theme}
        inGame={inGame}
        ref={setReference}
        icon={icon}
        {...getReferenceProps()}
      >
        {isEmptyName ? (
          <span className="font-pixel text-[12.5px]">
            <Delay fallback={<FallbackIcon />}>
              <Icon icon={TriangleAlert} className="mr-1" />
            </Delay>
            <span>
              <FormattedMessage defaultMessage="Need A Name" />
            </span>
          </span>
        ) : (
          name
        )}
      </NameBox>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={setFloating}
            className="bg-surface-unit z-20 rounded-sm border px-4 py-3 shadow"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <SelectedCharacterPortraitPreview
              spaceId={member.space.spaceId}
              characterId={portraitCharacterId}
            />
            {content === 'name' ? (
              <NameEditContent
                member={member}
                dismiss={() => {
                  setContent('name');
                  setIsOpen(false);
                }}
                onViewAllCharacters={() => setContent('characters')}
              />
            ) : (
              <CharacterPopover member={member} onBack={() => setContent('name')} />
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
