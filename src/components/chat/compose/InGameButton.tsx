import * as React from 'react';
import Tooltip from '../../atoms/Tooltip';
import { relative, textXs } from '../../../styles/atoms';
import { isMac } from '../../../utils/browser';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import mask from '../../../assets/icons/theater-masks.svg';
import { css } from '@emotion/core';
import { ComposeDispatch, update } from './reducer';

interface Props {
  inGame: boolean;
  composeDispatch: ComposeDispatch;
  inputName: string;
  className?: string;
}

const inGameContainer = css`
  ${[relative]};

  & .tooltip {
    visibility: hidden;
  }

  &:hover .tooltip {
    visibility: visible;
  }
`;

function InGameButton({ inGame, composeDispatch, className }: Props) {
  const toggleInGame = () => composeDispatch(update({ inGame: !inGame }));
  return (
    <div css={inGameContainer} className={className}>
      <Tooltip className="tooltip">
        <div>游戏内</div>
        <div css={[textXs]}>{isMac ? 'Option' : 'Alt'}</div>
      </Tooltip>
      <ChatItemToolbarButton on={inGame} onClick={toggleInGame} sprite={mask} size="large" />
    </div>
  );
}

export default React.memo(InGameButton);
