import * as React from 'react';
import { useCallback, useState } from 'react';
import {
  inlineBlock,
  mB,
  pX,
  pY,
  relative,
  roundedSm,
  spacingN,
  textBase,
  uiShadow,
  widthFull,
} from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import ellipsis from '../../../assets/icons/ellipsis.svg';
import { css } from '@emotion/core';
import { ComposeDispatch, update } from './reducer';
import { gray, textColor } from '../../../styles/colors';
import ActionSwitch from './ActionSwitch';

interface Props {
  inGame: boolean;
  isAction: boolean;
  composeDispatch: ComposeDispatch;
  inputName: string;
}

const menuStyle = css`
  width: 10rem;
  position: absolute;
  bottom: 90%;
  text-align: right;
  z-index: 5;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(1px);
  ${[roundedSm, uiShadow]};
  padding: ${spacingN(2)};
  &[data-show='false'] {
    display: none;
  }
`;

const nameInput = css`
  border: 1px solid ${gray['800']};
  color: ${textColor};
  ${[textBase, pY(1.5), pX(1.5), roundedSm, widthFull]};

  background-color: ${gray['900']};
  &:focus {
    border-color: ${gray['700']};
    outline: none;
  }
`;

const onKeyDown: React.KeyboardEventHandler = (e) => e.stopPropagation();

function MenuButton({ inputName, composeDispatch, isAction }: Props) {
  const [menu, showMenu] = useState(false);
  const toggleMenu = useCallback(() => showMenu((value) => !value), []);
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    composeDispatch(update({ inputName: e.target.value }));
  };
  return (
    <div css={[inlineBlock, relative]} onKeyDown={onKeyDown}>
      <ChatItemToolbarButton on={menu} onClick={toggleMenu} sprite={ellipsis} size="large" />
      <div css={menuStyle} data-show={menu}>
        <div css={mB(1)}>
          <input value={inputName} css={nameInput} onChange={handleNameChange} placeholder="临时角色名" />
        </div>
        <ActionSwitch isAction={isAction} composeDispatch={composeDispatch} />
      </div>
    </div>
  );
}

export default MenuButton;
