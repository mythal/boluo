import Gamemaster from '@boluo/icons/Gamemaster';
import TriangleAlert from '@boluo/icons/TriangleAlert';
import { useMemo, useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { NameBox } from '@boluo/ui/chat/NameBox';
import { useMessageColor } from '../../hooks/useMessageColor';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import Icon from '@boluo/ui/Icon';
import { Delay } from '@boluo/ui/Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { NameUserPanel } from './NameUserPanel';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useMember } from '../../hooks/useMember';
import { NameCharacterPanel } from './NameCharacterPanel';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  userId: string;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  messageColor?: string | null | undefined;
  colorSeed?: string | null;
  characterId?: string | null;
  portraitId?: string | null;
}

export const Name: FC<Props> = ({
  name,
  isMaster,
  inGame,
  userId,
  messageColor,
  colorSeed,
  characterId,
  portraitId,
}) => {
  const member = useMember();
  const theme = useResolvedTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, middlewareData, placement, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top-start',
    middleware: [
      flip({ mainAxis: true, crossAxis: false }),
      shift(),
      offset({ mainAxis: 4, crossAxis: -4 }),
      hide(),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  const isEmptyName = name === '' || name == null;
  const color = useMessageColor(userId, inGame, messageColor, colorSeed);
  const masterIcon = useMemo(
    () => <Icon icon={Gamemaster} className="inline-block h-[1em] w-[1em]" />,
    [],
  );
  return (
    <>
      <NameBox
        pressed={isOpen}
        interactive={userId != null}
        color={color}
        theme={theme}
        inGame={inGame}
        icon={isMaster ? masterIcon : undefined}
        ref={setReference}
        {...getReferenceProps()}
      >
        {isEmptyName ? (
          <span className="font-pixel text-[12.5px]">
            <Delay fallback={<FallbackIcon />}>
              <Icon className="mr-1" icon={TriangleAlert} />
            </Delay>
            <FormattedMessage defaultMessage="No Name" />
          </span>
        ) : (
          name
        )}
      </NameBox>
      {isOpen && userId && (
        <FloatingPortal>
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps({
              onPointerDown: (event) => event.stopPropagation(),
            })}
            className={middlewareData.hide?.referenceHidden === true ? 'hidden' : ''}
          >
            {characterId != null && member != null ? (
              <NameCharacterPanel
                characterId={characterId}
                spaceId={member.space.spaceId}
                userId={userId}
                portraitId={portraitId}
                playerDetailsPosition={placement.startsWith('top') ? 'before' : 'after'}
              />
            ) : (
              <NameUserPanel userId={userId} />
            )}
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
