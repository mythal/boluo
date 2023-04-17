import { Dice } from 'icons';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { makeComposeAction } from '../../state/actions/compose';
import { AddDiceButton } from '../compose/AddDiceButton';

interface Props {
}

export const SelfCursor: FC<Props> = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () => dispatch(makeComposeAction('addDice', {}));
  return (
    <>
      <div className="inline-block w-[2px] h-7 absolute bg-surface-800">
      </div>
      <div className="inline-block absolute translate-y-6 -translate-x-1 bg-surface-800 rounded-sm">
        <button onClick={handleAddDice} className="p-2 rounded hover:bg-surface-600 text-surface-200 text-xl">
          <Dice />
        </button>
      </div>
    </>
  );
};
