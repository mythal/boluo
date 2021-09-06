import * as React from 'react';
import { useCallback, useState } from 'react';
import {
  inlineBlock,
  mB,
  mL,
  mR,
  pX,
  pY,
  relative,
  roundedSm,
  spacingN,
  textBase,
  widthFull,
} from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import ellipsis from '../../../assets/icons/ellipsis.svg';
import { css } from '@emotion/core';
import { ComposeDispatch, update, UserItem } from './reducer';
import { gray, textColor } from '../../../styles/colors';
import ActionSwitch from './ActionSwitch';
import { ComposeInputAction } from './ComposeInput';
import WhisperTo from './WhisperTo';
import { floatPanel } from '../styles';
import ChatImageUploadButton from './ImageUploadButton';

interface Props {
  inGame: boolean;
  isAction: boolean;
  composeDispatch: ComposeDispatch;
  inputName: string;
  hasImage: boolean;
  className?: string;
  composeInputRef: React.RefObject<ComposeInputAction>;
  whisperTo?: UserItem[] | null;
}

const menuStyle = css`
  width: 10rem;
  position: absolute;
  bottom: 90%;
  z-index: 5;
  right: 0;
  ${floatPanel};
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

const buttons = css`
  display: flex;
  justify-content: space-between;
`;

function MenuButton({ inputName, composeDispatch, isAction, hasImage, whisperTo, className }: Props) {
  const [menu, showMenu] = useState(false);
  const toggleMenu = useCallback(() => showMenu((value) => !value), []);
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    composeDispatch(update({ inputName: e.target.value }));
  };
  return (
    <div css={[inlineBlock, relative]} className={className} onKeyDown={onKeyDown}>
      <ChatItemToolbarButton on={menu} onClick={toggleMenu} sprite={ellipsis} size="large" />
      <div css={menuStyle} data-show={menu}>
        <div css={mB(2)}>
          <input value={inputName} css={nameInput} onChange={handleNameChange} placeholder="临时角色名" />
        </div>
        <div css={mB(2)}>
          <WhisperTo />
        </div>
        <div css={buttons}>
          <div>
            <ActionSwitch size="large" css={mR(1)} />
          </div>
          <ChatImageUploadButton size="large" hasImage={hasImage} composeDispatch={composeDispatch} css={[mL(1)]} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(MenuButton);
