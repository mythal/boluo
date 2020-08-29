import * as React from 'react';
import ChatItemToolbarButton from '../atoms/ChatItemToolbarButton';
import { flexRowReverse, mR } from '../../styles/atoms';
import mask from '../../assets/icons/theater-masks.svg';
import running from '../../assets/icons/running.svg';
import broadcastTower from '../../assets/icons/broadcast-tower.svg';
import styled from '@emotion/styled';
import { ComposeDispatch } from './PreviewCompose';
import { isMac } from '../../utils/browser';

interface Props {
  composeDispatch: ComposeDispatch;
  inGame: boolean;
  isAction: boolean;
  broadcast: boolean;
}

const Toolbar = styled.div`
  ${[flexRowReverse]};
  grid-area: toolbar;
`;

function ComposeToolbar({ composeDispatch, inGame, isAction, broadcast }: Props) {
  const toggleInGame = () => composeDispatch({ inGame: !inGame });
  const toggleIsAction = () => composeDispatch({ isAction: !isAction });
  const toggleBroadcast = () => composeDispatch({ broadcast: !broadcast });
  return (
    <Toolbar>
      <ChatItemToolbarButton
        on={inGame}
        onClick={toggleInGame}
        sprite={mask}
        title="游戏内"
        info={isMac ? 'Option' : 'Alt'}
      />
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
