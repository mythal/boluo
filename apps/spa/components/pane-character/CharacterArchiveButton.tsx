import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import type { Character } from '@boluo/api';
import { useQueryCharacterUsages } from '@boluo/hooks/useQueryCharacterUsages';
import Archive from '@boluo/icons/Archive';
import ArchiveRestore from '@boluo/icons/ArchiveRestore';
import { Button } from '@boluo/ui/Button';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  character: Character;
  disabled: boolean;
  onSetArchived: (archived: boolean) => void;
}

export const CharacterArchiveButton: FC<Props> = ({ character, disabled, onSetArchived }) => {
  const archived = character.archivedAt != null;
  const {
    data: usages,
    error,
    isLoading,
  } = useQueryCharacterUsages(
    archived ? undefined : character.spaceId,
    archived ? undefined : character.id,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const { refs, context, floatingStyles } = useFloating({
    open: isConfirming,
    placement: 'top-end',
    onOpenChange: setIsConfirming,
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 8 })],
  });
  const { setReference, setFloating } = useFloatingSetters(refs);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'alertdialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);
  const usageCount = new Set(usages?.map(({ user }) => user.id)).size;
  const shouldConfirm = usageCount > 0 || error != null;

  const handleClick = () => {
    if (archived) {
      onSetArchived(false);
    } else if (shouldConfirm) {
      setIsConfirming((confirming) => !confirming);
    } else {
      onSetArchived(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        ref={setReference}
        on={isConfirming}
        disabled={disabled || (!archived && isLoading)}
        onClick={handleClick}
      >
        {archived ? <ArchiveRestore /> : <Archive />}
        {archived ? (
          <FormattedMessage defaultMessage="Unarchive" />
        ) : (
          <FormattedMessage defaultMessage="Archive" />
        )}
      </Button>
      {isConfirming && (
        <FloatingPortal>
          <div ref={setFloating} style={{ ...floatingStyles, zIndex: 30 }} {...getFloatingProps()}>
            <FloatingBox className="w-72 p-3">
              {usageCount > 0 ? (
                <FormattedMessage
                  defaultMessage="This character is currently used by {usageCount, plural, one {# member} other {# members}}. Archiving it will unbind it from their channels. Are you sure?"
                  values={{ usageCount }}
                />
              ) : (
                <FormattedMessage defaultMessage="Archiving this character will unbind it from any channels where it is currently in use. Are you sure?" />
              )}
              <div className="flex justify-end gap-2 pt-3">
                <Button small onClick={() => setIsConfirming(false)}>
                  <FormattedMessage defaultMessage="Cancel" />
                </Button>
                <Button
                  small
                  variant="danger"
                  onClick={() => {
                    setIsConfirming(false);
                    onSetArchived(true);
                  }}
                >
                  <FormattedMessage defaultMessage="Archive" />
                </Button>
              </div>
            </FloatingBox>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
