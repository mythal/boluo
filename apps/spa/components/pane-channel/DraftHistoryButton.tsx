import { ButtonInline } from '@boluo/ui/ButtonInline';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { type FC, useEffect } from 'react';
import BookCopy from '@boluo/icons/BookCopy';
import { FormattedMessage } from 'react-intl';
import { dateTimeFormat } from '../../date';
import type { ComposeDraftEntry } from '../../state/compose-backup.worker.types';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtom } from 'jotai';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';

interface DraftHistoryButtonProps {
  drafts: ComposeDraftEntry[];
  onRestore: (text: string) => void;
}

export const DraftHistoryButton: FC<DraftHistoryButtonProps> = ({ drafts, onRestore }) => {
  const { selfPreviewDraftHistoryOpenAtom } = useChannelAtoms();
  const isFocused = usePaneIsFocus();
  const [open, setOpen] = useAtom(selfPreviewDraftHistoryOpenAtom);

  const { refs, floatingStyles, context } = useFloating<HTMLSpanElement>({
    open,
    onOpenChange: setOpen,
    placement: 'top-end',
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'start' }), shift()],
    whileElementsMounted: autoUpdate,
  });
  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    if (drafts.length === 0 && open) {
      setOpen(false);
    }
  }, [drafts.length, open, setOpen]);

  if (drafts.length === 0) {
    return null;
  }

  return (
    <span ref={refs.setReference} className={isFocused ? 'opacity-100' : 'opacity-0'}>
      <ButtonInline aria-pressed={open} onClick={() => setOpen((value) => !value)}>
        <Icon icon={BookCopy} className="mr-1" />
        <FormattedMessage
          defaultMessage="Draft History ({count})"
          values={{ count: drafts.length }}
        />
      </ButtonInline>
      {open && (
        <FloatingPortal>
          <FloatingBox
            className="max-h-96 max-w-sm overflow-y-auto p-2"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <div className="flex flex-col">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => {
                    onRestore(draft.text);
                    setOpen(false);
                  }}
                  className="hover:bg-surface-interactive-hover cursor-pointer rounded px-2 py-1 text-left"
                >
                  <div className="text-text-secondary text-xs">
                    <FormattedMessage
                      defaultMessage="{start} Modified {updated}"
                      values={{
                        start: dateTimeFormat(new Date(draft.createdAt)),
                        updated: dateTimeFormat(new Date(draft.updatedAt)),
                      }}
                    />
                  </div>
                  <div className="line-clamp-3 py-1 font-mono text-sm break-all">{draft.text}</div>
                </button>
              ))}
            </div>
          </FloatingBox>
        </FloatingPortal>
      )}
    </span>
  );
};
