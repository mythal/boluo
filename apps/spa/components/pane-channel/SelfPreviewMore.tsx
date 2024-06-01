import { MessageSquarePlus } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import {
  useFloating,
  offset,
  useHover,
  safePolygon,
  useInteractions,
  FloatingPortal,
  useDismiss,
  type UseHoverProps,
} from '@floating-ui/react';
import clsx from 'clsx';
import { type FC, useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useSetAtom } from 'jotai';
import { useDefaultRollCommand } from '../../hooks/useDefaultRollCommand';

const useHoverProps: UseHoverProps = {
  handleClose: safePolygon(),
  restMs: 75,
  delay: {
    close: 400,
  },
};

const useAddDice = () => {
  const defaultRollCommand = useDefaultRollCommand();
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);

  return useCallback(() => {
    dispatch({ type: 'addDice', payload: { defaultRollCommand } });
  }, [defaultRollCommand, dispatch]);
};

const MoreButton: FC = ({}) => {
  const intl = useIntl();
  const label = intl.formatMessage({ defaultMessage: 'Open the more menu' });
  const [open, setOpen] = useState(false);
  const addDice = useAddDice();
  const { floatingStyles, refs, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top-start',
    middleware: [offset({ mainAxis: 4 })],
  });
  const hover = useHover(context, useHoverProps);
  const dismiss = useDismiss(context, {});
  const { getFloatingProps, getReferenceProps } = useInteractions([hover, dismiss]);
  return (
    <>
      {' '}
      <button
        ref={refs.setReference}
        className={clsx(
          'rounded-sm border px-1',
          open
            ? 'bg-preview-whisper-add-hover-bg border-preview-whisper-add-border text-preview-whisper-add-text'
            : 'text-text-lighter group-hover/item:text-preview-whisper-add-text group-hover/item:bg-preview-whisper-add-bg border-preview-whisper-add-border/35 group-hover/item: group-hover/item:hover:bg-preview-whisper-add-hover-bg',
        )}
        aria-label={label}
        onClick={() => {
          addDice();
          setOpen(false);
        }}
        {...getReferenceProps()}
      >
        <Icon icon={MessageSquarePlus} />
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="rounded-sm bg-white p-2 text-black shadow-md"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            placeholder
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

const MorePlaceHolder: FC = () => {
  return <span className="text-text-light italic">Placeholder</span>;
};

export const More: FC<{ empty: boolean }> = ({ empty }) => {
  if (empty) {
    return <MorePlaceHolder />;
  } else {
    return <MoreButton />;
  }
};

export default More;
