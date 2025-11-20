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
import { useSetAtom } from 'jotai';
import { type FC, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { dateTimeFormat } from '../../date';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import type { ComposeDraftEntry } from '../../state/compose-backup.worker.types';
import { FloatingBox } from '@boluo/ui/FloatingBox';

interface DraftHistoryButtonProps {
  drafts: ComposeDraftEntry[];
  onRestore: (text: string) => void;
}

export const DraftHistoryButton: FC<DraftHistoryButtonProps> = ({ drafts, onRestore }) => {
  const [open, setOpen] = useState(false);
  const { hideSelfPreviewTimeoutAtom } = useChannelAtoms();
  const setSelfPreviewLock = useSetAtom(hideSelfPreviewTimeoutAtom);

  useEffect(() => {
    if (!open) return;
    const extendLock = () =>
      setSelfPreviewLock((timestamp) => Math.max(timestamp, Date.now() + 1000 * 30));
    extendLock();
    const interval = window.setInterval(extendLock, 4000);
    return () => {
      window.clearInterval(interval);
      setSelfPreviewLock(Date.now() + 1000 * 6);
    };
  }, [open, setSelfPreviewLock]);

  const { refs, floatingStyles, context } = useFloating<HTMLSpanElement>({
    open,
    onOpenChange: setOpen,
    placement: 'top-start',
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'start' }), shift()],
    whileElementsMounted: autoUpdate,
  });
  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  useEffect(() => {
    if (drafts.length === 0 && open) {
      setOpen(false);
    }
  }, [drafts.length, open]);

  if (drafts.length === 0) {
    return null;
  }

  return (
    <span ref={refs.setReference}>
      <ButtonInline onClick={() => setOpen((value) => !value)}>
        <FormattedMessage
          defaultMessage="Draft History ({count})"
          values={{ count: drafts.length }}
        />
      </ButtonInline>
      {open && (
        <FloatingPortal>
          <FloatingBox
            className="max-h-96 max-w-sm p-2"
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
                  className="hover:bg-surface-default cursor-pointer rounded px-2 py-1 text-left"
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
