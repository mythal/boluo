import clsx from 'clsx';
import { Bold, Dice, Link } from 'icons';
import { useSetAtom } from 'jotai';
import { forwardRef } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { makeComposeAction } from '../../state/actions/compose';
import { SelfCursorButton } from './SelfCursorButton';

interface Props {}

export const SelfCursorToolbar = forwardRef<HTMLDivElement, Props>(({}, ref) => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () => dispatch(makeComposeAction('addDice', {}));
  const handleAddLink = () => dispatch(makeComposeAction('link', { text: '', href: '' }));
  const handleBold = () => dispatch(makeComposeAction('bold', { text: '', href: '' }));
  return (
    <div
      ref={ref}
      data-flip="false"
      data-hidden="false"
      className={clsx(
        'inline-flex fixed transition-all ease-out duration-300 bg-surface-700 border border-surface-900 rounded-sm shadow-md',
        'data-[flipped=true]:-translate-x-full',
        'data-[hide=true]:hidden',
        'opacity-40 hover:opacity-100',
      )}
    >
      <SelfCursorButton onClick={handleAddDice}>
        <Dice />
      </SelfCursorButton>
      <SelfCursorButton onClick={handleAddLink}>
        <Link />
      </SelfCursorButton>
      <SelfCursorButton onClick={handleBold}>
        <Bold />
      </SelfCursorButton>
    </div>
  );
});
SelfCursorToolbar.displayName = 'SelfCursorToolbar';
