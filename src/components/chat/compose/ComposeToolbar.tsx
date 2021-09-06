import * as React from 'react';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { flexRowReverse, mR } from '../../../styles/atoms';
import mask from '../../../assets/icons/theater-masks.svg';
import running from '../../../assets/icons/running.svg';
import broadcastTower from '../../../assets/icons/broadcast-tower.svg';
import styled from '@emotion/styled';
import { broadcastAtom, inGameAtom, isActionAtom } from './state';
import { useCallback } from 'react';
import { useAtom } from 'jotai';

interface Props {}

const Toolbar = styled.div`
  ${[flexRowReverse]};
  grid-area: toolbar;
`;

function ComposeToolbar(props: Props) {
  const [isAction, updateAction] = useAtom(isActionAtom);
  const [broadcast, updateBroadcast] = useAtom(broadcastAtom);
  const [inGame, updateInGame] = useAtom(inGameAtom);
  const toggleIsAction = useCallback(() => updateAction((isAction) => !isAction), [updateAction]);
  const toggleBroadcast = useCallback(() => updateBroadcast((broadcast) => !broadcast), [updateBroadcast]);
  const toggleInGame = useCallback(() => updateInGame((inGame) => !inGame), [updateInGame]);
  return (
    <Toolbar>
      <ChatItemToolbarButton on={inGame} onClick={toggleInGame} sprite={mask} title="游戏内" info="Esc" />
      <ChatItemToolbarButton css={mR(1)} on={isAction} onClick={toggleIsAction} sprite={running} title="描述动作" />
      <ChatItemToolbarButton
        css={mR(1)}
        sprite={broadcastTower}
        on={broadcast}
        onClick={toggleBroadcast}
        title="输入中广播"
      />
    </Toolbar>
  );
}

export default React.memo(ComposeToolbar);
