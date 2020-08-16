import * as React from 'react';
import ChatItemToolbarButton from '@/components/atoms/ChatItemToolbarButton';
import { flexRowReverse, mR } from '@/styles/atoms';
import mask from '@/assets/icons/theater-masks.svg';
import running from '@/assets/icons/running.svg';
import broadcastTower from '@/assets/icons/broadcast-tower.svg';
import styled from '@emotion/styled';

interface Props {
  inGame: boolean;
  toggleInGame: () => void;
  isAction: boolean;
  toggleAction: () => void;
  broadcast: boolean;
  toggleBroadcast: () => void;
}

const Toolbar = styled.div`
  ${[flexRowReverse]};
  grid-area: toolbar;
`;

function ChatComposeToolbar({ inGame, toggleInGame, isAction, toggleAction, broadcast, toggleBroadcast }: Props) {
  return (
    <Toolbar>
      <ChatItemToolbarButton css={mR(1)} on={inGame} onClick={toggleInGame} sprite={mask} title="游戏内" />

      <ChatItemToolbarButton css={mR(1)} on={isAction} onClick={toggleAction} sprite={running} title="描述动作" />

      <ChatItemToolbarButton sprite={broadcastTower} on={broadcast} onClick={toggleBroadcast} title="输入中广播" />
    </Toolbar>
  );
}

export default React.memo(ChatComposeToolbar);
