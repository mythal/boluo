import { FC } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSetAtom } from 'jotai';
import { SelfCursorButton } from './SelfCursorButton';
import { Bold, Dice, Link } from '@boluo/icons';

interface Props {
  collapsed: boolean;
}

export const SelfCursorToolbarButtons: FC<Props> = ({ collapsed }) => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () => dispatch({ type: 'addDice', payload: {} });
  const handleAddLink = () => dispatch({ type: 'link', payload: { text: '', href: '' } });
  const handleBold = () => dispatch({ type: 'bold', payload: { text: '' } });
  return (
    <>
      {collapsed && (
        <SelfCursorButton onClick={handleAddDice}>
          <Dice />
        </SelfCursorButton>
      )}
      {!collapsed && (
        <>
          <SelfCursorButton onClick={handleAddLink}>
            <Link />
          </SelfCursorButton>
          <SelfCursorButton onClick={handleBold}>
            <Bold />
          </SelfCursorButton>
        </>
      )}
    </>
  );
};
