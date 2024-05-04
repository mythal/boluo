import { FC } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSetAtom } from 'jotai';
import { SelfCursorButton } from './SelfCursorButton';
import { Bold, Dice, Link } from '@boluo/icons';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { useChannelId } from '../../hooks/useChannelId';

interface Props {
  collapsed: boolean;
}

export const SelfCursorToolbarButtons: FC<Props> = ({ collapsed }) => {
  const channelId = useChannelId();
  const { data: channel } = useQueryChannel(channelId);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const handleAddDice = () =>
    dispatch({ type: 'addDice', payload: { defaultRollCommand: channel?.defaultRollCommand ?? 'd' } });
  const handleAddLink = () => dispatch({ type: 'link', payload: { text: '', href: '' } });
  const handleBold = () => dispatch({ type: 'bold', payload: { text: '' } });

  return (
    <>
      {collapsed && (
        <>
          <SelfCursorButton onClick={handleAddDice}>
            <Dice />
          </SelfCursorButton>
        </>
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
