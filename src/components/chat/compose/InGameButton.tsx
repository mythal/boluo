import * as React from 'react';
import Tooltip from '../../atoms/Tooltip';
import { mT, pX, pY, relative, roundedSm, textBase, textXs } from '../../../styles/atoms';
import { isMac } from '../../../utils/browser';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import mask from '../../../assets/icons/theater-masks.svg';
import { css } from '@emotion/core';
import { gray, textColor } from '../../../styles/colors';
import { ComposeDispatch, update } from './reducer';

interface Props {
  inGame: boolean;
  composeDispatch: ComposeDispatch;
  inputName: string;
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

const nameInput = css`
  border: 1px solid ${gray['800']};
  color: ${textColor};
  ${[textBase, pY(1.5), pX(1.5), roundedSm]};
  width: 8rem;
  background-color: ${gray['900']};
  &:focus {
    border-color: ${gray['700']};
    outline: none;
  }
`;
function InGameButton({ inGame, composeDispatch, inputName }: Props) {
  const toggleInGame = () => composeDispatch(update({ inGame: !inGame }));
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    composeDispatch(update({ inputName: e.target.value }));
  };
  return (
    <div css={inGameContainer}>
      <Tooltip className="tooltip">
        <div>游戏内</div>
        <div css={[textXs]}>{isMac ? 'Option' : 'Alt'}</div>
        {inGame && (
          <div css={[mT(1)]}>
            <input value={inputName} css={nameInput} onChange={handleNameChange} placeholder="临时角色名" />
          </div>
        )}
      </Tooltip>
      <ChatItemToolbarButton on={inGame} onClick={toggleInGame} sprite={mask} size="large" />
    </div>
  );
}

export default React.memo(InGameButton);
