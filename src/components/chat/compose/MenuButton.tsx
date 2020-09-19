import * as React from 'react';
import { useCallback, useState } from 'react';
import { inlineBlock, mB, mR, pX, pY, relative, roundedSm, spacingN, textBase, widthFull } from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import ellipsis from '../../../assets/icons/ellipsis.svg';
import d20 from '../../../assets/icons/d20.svg';
import ear from '../../../assets/icons/ear.svg';
import { css } from '@emotion/core';
import { ComposeDispatch, update, UserItem } from './reducer';
import { gray, textColor } from '../../../styles/colors';
import ActionSwitch from './ActionSwitch';
import { ComposeInputAction } from './ComposeInput';
import WhisperTo from './WhisperTo';
import { floatPanel } from '../styles';

interface Props {
  inGame: boolean;
  isAction: boolean;
  composeDispatch: ComposeDispatch;
  inputName: string;
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

function MenuButton({ inputName, composeDispatch, isAction, composeInputRef, whisperTo }: Props) {
  const [menu, showMenu] = useState(false);
  const toggleMenu = useCallback(() => showMenu((value) => !value), []);
  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    composeDispatch(update({ inputName: e.target.value }));
  };
  const appendDice: React.MouseEventHandler = (e) => {
    e.preventDefault();
    if (composeInputRef.current) {
      composeInputRef.current.appendDice();
    }
  };
  const switchWhisper = () => {
    if (whisper) {
      composeDispatch(update({ whisperTo: undefined }));
    } else {
      composeDispatch(update({ whisperTo: [] }));
    }
  };
  const whisper = whisperTo !== null && whisperTo !== undefined;
  return (
    <div css={[inlineBlock, relative]} onKeyDown={onKeyDown}>
      <ChatItemToolbarButton on={menu} onClick={toggleMenu} sprite={ellipsis} size="large" />
      <div css={menuStyle} data-show={menu}>
        <div css={mB(2)}>
          <input value={inputName} css={nameInput} onChange={handleNameChange} placeholder="临时角色名" />
        </div>
        {whisper && (
          <div css={mB(2)}>
            <WhisperTo whisperTo={whisperTo!} composeDispatch={composeDispatch} />
          </div>
        )}
        <div css={buttons}>
          <div>
            <ActionSwitch isAction={isAction} composeDispatch={composeDispatch} size="large" css={mR(1)} />
            <ChatItemToolbarButton on={whisper} onClick={switchWhisper} sprite={ear} title="悄悄话" size="large" />
          </div>
          <ChatItemToolbarButton onClick={appendDice} sprite={d20} title="添加骰子" size="large" />
        </div>
      </div>
    </div>
  );
}

export default React.memo(MenuButton);
