import { css } from '@emotion/react';
import { darken } from 'polished';
import * as React from 'react';
import { useCallback } from 'react';
import { type ChannelMember } from '../../../api/channels';
import { useDispatch, useSelector } from '../../../store';
import {
  breakpoint,
  mediaQuery,
  mR,
  p,
  pX,
  pY,
  roundedSm,
  spacing,
  spacingN,
  textBase,
  uiShadow,
} from '../../../styles/atoms';
import { blue, gray, textColor, white } from '../../../styles/colors';
import { type Id } from '../../../utils/id';
import { handleKeyDown } from '../key';
import MessageMedia from '../MessageMedia';
import { floatPanel } from '../styles';
import { AddDiceButton } from './AddDiceButton';
import BroadcastSwitch from './BroadcastSwitch';
import ComposeInput from './ComposeInput';
import { Editing } from './Editing';
import InGameButton from './InGameButton';
import { SendButton } from './SendButton';
import { useOnSend } from './useOnSend';

const container = css`
  grid-row: compose-start / compose-end;
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-areas:
    ' edit toolbar  send'
    'input   input input';
  ${mediaQuery(breakpoint.md)} {
    gap: 0 ${spacingN(2)};
    grid-template-columns: auto 1fr auto;
    grid-template-areas:
      '   edit  edit  edit'
      'toolbar input  send';
  }
  gap: ${spacingN(2)};
  align-items: flex-end;
  background-color: ${darken(0.05, blue['900'])};
  ${pX(2)};
  ${pY(2)};
  position: relative;
  &:focus-within {
    background-color: ${blue['900']};
  }

  &:focus-within .float-toolbar {
    opacity: 100%;
  }
  & .float-toolbar {
    opacity: 25%;
    position: absolute;
    top: 0;
    left: 0;
    transform: translateY(calc(-100% - ${spacing} * 2));
    ${[p(1), roundedSm, uiShadow, floatPanel]};
    ${mediaQuery(breakpoint.md)} {
      left: unset;
      right: 0;
    }
  }
`;

const toolbar = css`
  grid-area: toolbar;
  display: flex;
`;

const inputContainer = css`
  width: 100%;
  display: flex;
  grid-area: input;
  position: relative;
`;

const input = css`
  resize: none;
  height: 2.5rem;
  width: 100%;
  min-height: 100%;
  color: ${textColor};
  ${[textBase, p(2), roundedSm]};
  background-color: ${gray['900']};
  border: none;
  &:focus {
    outline: none;
  }
`;

const sendContainer = css`
  grid-area: send;
`;

const mediaContainer = css`
  position: absolute;
  top: 0;
  right: 4rem;
  ${[roundedSm]};
  border: 1px solid ${white};
  transform: translateY(-90%) rotate(25deg);
`;

const editBar = css`
  grid-area: edit;
  margin-bottom: 0.25em;
`;

interface Props {
  channelId: Id;
  member: ChannelMember;
}

function Compose({ channelId }: Props) {
  const media = useSelector((state) => state.chatStates.get(channelId)?.compose.media);
  const isEditing = useSelector((state) => Boolean(state.chatStates.get(channelId)?.compose.edit));
  const onSend = useOnSend();
  const dispatch = useDispatch();
  const setInGame = useCallback(
    (inGame: boolean | 'TOGGLE') => dispatch({ type: 'SET_IN_GAME', pane: channelId, inGame }),
    [channelId, dispatch],
  );
  const enterSend = useSelector((state) => state.profile?.settings.enterSend);
  return (
    <div css={container}>
      {isEditing && <Editing css={editBar} />}
      <div css={toolbar}>
        <BroadcastSwitch size="large" css={[mR(1)]} />
        <InGameButton css={[mR(1)]} />
        <AddDiceButton inCompose />
      </div>
      <div
        css={inputContainer}
        onKeyDown={handleKeyDown(onSend, () => setInGame('TOGGLE'), enterSend)}
      >
        <ComposeInput autoFocus autoSize css={[input]} />
      </div>
      {media && (
        <div css={mediaContainer}>
          <MessageMedia
            file={media instanceof File ? media : undefined}
            mediaId={typeof media === 'string' ? media : undefined}
          />
        </div>
      )}
      <div css={sendContainer}>
        <SendButton onSend={onSend} editing={isEditing} />
      </div>
    </div>
  );
}

export default React.memo(Compose);
