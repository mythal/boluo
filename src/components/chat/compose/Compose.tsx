import * as React from 'react';
import { css } from '@emotion/core';
import { blue, gray, textColor, white } from '../../../styles/colors';
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
import { darken } from 'polished';
import BroadcastSwitch from './BroadcastSwitch';
import { Id } from '../../../utils/id';
import { ChannelMember } from '../../../api/channels';
import ComposeInput from './ComposeInput';
import InGameButton from './InGameButton';
import { floatPanel } from '../styles';
import { SendButton } from './SendButton';
import MessageMedia from '../MessageMedia';
import { useAtomValue } from 'jotai/utils';
import { editForAtom, mediaAtom } from './state';

const container = css`
  grid-row: compose-start / compose-end;
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-areas:
    ' edit    edit  edit'
    '    . toolbar  send'
    'input   input input';
  ${mediaQuery(breakpoint.md)} {
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'toolbar input  send';
  }
  gap: ${spacingN(2)};
  align-items: flex-end;
  background-color: ${darken(0.05, blue['900'])};
  ${pX(2)} ${pY(2)};
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
`;

interface Props {
  channelId: Id;
  member: ChannelMember;
}

function Compose({ channelId, member }: Props) {
  const media = useAtomValue(mediaAtom, channelId);
  const editFor = useAtomValue(editForAtom, channelId);
  return (
    <div css={container}>
      {editFor && <div css={editBar}>正在编辑</div>}
      <div css={toolbar}>
        <BroadcastSwitch size="large" css={[mR(1)]} />
        <InGameButton css={[mR(1)]} />
      </div>
      <div css={inputContainer}>
        <ComposeInput autoFocus autoSize css={[input]} />
      </div>
      {media && (
        <div css={mediaContainer}>
          <MessageMedia file={media} />
        </div>
      )}
      <div css={sendContainer}>
        <SendButton />
      </div>
    </div>
  );
}

export default React.memo(Compose);
