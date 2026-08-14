import { ButtonInline } from '@boluo/ui/ButtonInline';
import { useAtomValue, useSetAtom } from 'jotai';
import { type FC, type ReactNode, type RefObject, useEffect, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { usePortrayableCharacters } from '../../hooks/usePortrayableCharacters';
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from '@floating-ui/react';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';

interface Props {
  spaceId: string;
  anchorRef: RefObject<HTMLElement | null>;
}

export const AsCharacterPopover: FC<Props> = ({ spaceId, anchorRef }) => {
  const { composeAtom, asTargetAtom } = useChannelAtoms();
  const asTarget = useAtomValue(asTargetAtom);
  const dispatch = useSetAtom(composeAtom);
  const { resolve, suggest } = usePortrayableCharacters(spaceId);
  const referenceResolution =
    asTarget?.type === 'CharacterReference' ? resolve(asTarget.identifier) : null;
  const suggestions = useMemo(
    () => (asTarget?.type === 'TemporaryName' ? suggest(asTarget.name) : []),
    [asTarget, suggest],
  );
  let content: ReactNode = null;
  if (referenceResolution?.status === 'Loading') {
    content = (
      <span role="status" className="text-text-muted">
        <FormattedMessage defaultMessage="Loading character…" />
      </span>
    );
  } else if (referenceResolution?.status === 'Error') {
    content = (
      <span role="alert" className="text-state-warning-text">
        <FormattedMessage defaultMessage="Characters could not be loaded." />
      </span>
    );
  } else if (referenceResolution?.status === 'NotFound') {
    content = (
      <span role="alert" className="text-state-warning-text">
        <FormattedMessage
          defaultMessage="Character “@{identifier}” is unavailable or cannot be portrayed."
          values={{
            identifier: asTarget?.type === 'CharacterReference' ? asTarget.identifier : '',
          }}
        />
      </span>
    );
  } else if (suggestions.length > 0) {
    content = (
      <>
        <FormattedMessage defaultMessage="A matching character is available:" />
        {suggestions.map((character) => (
          <ButtonInline
            key={character.id}
            onClick={() =>
              dispatch({
                type: 'setAsTargetText',
                payload: { text: `@${character.key}`, setInGame: true },
              })
            }
            className="text-xs"
          >
            {character.name}
          </ButtonInline>
        ))}
      </>
    );
  }
  const { refs, floatingStyles } = useFloating({
    open: content != null,
    placement: 'top-start',
    middleware: [offset(6), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);
  useEffect(() => {
    setReference(anchorRef.current);
  }, [anchorRef, setReference]);
  if (content == null) return null;

  return (
    <FloatingPortal>
      <div
        ref={setFloating}
        style={floatingStyles}
        className="border-border-default bg-surface-unit text-text-muted z-30 flex max-w-[min(28rem,calc(100vw-1rem))] flex-wrap items-center gap-x-2 gap-y-1 rounded border px-3 py-2 text-xs shadow-lg"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {content}
      </div>
    </FloatingPortal>
  );
};
