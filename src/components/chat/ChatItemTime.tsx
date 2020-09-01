import * as React from 'react';
import { css } from '@emotion/core';
import { p, roundedMd, textXs } from '../../styles/atoms';
import { darken } from 'polished';
import { textColor } from '../../styles/colors';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import Icon from '../atoms/Icon';
import handle from '../../assets/icons/handle.svg';

interface Props {
  timestamp: number;
  handleProps?: DraggableProvidedDragHandleProps;
}

export const timeStyle = css`
  grid-area: time;
  color: ${darken(0.6, textColor)};
  display: flex;
  flex-direction: row-reverse;
  justify-content: space-between;
  ${[textXs, roundedMd, p(1)]};

  &[data-movable='true'] {
    &:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }

    &:focus {
      outline: none;
      background-color: rgba(255, 255, 255, 0.1);
    }
  }
`;

const num = (n: number) => (n > 9 ? String(n) : `0${n}`);

function ChatItemTime({ timestamp, handleProps }: Props) {
  const time = new Date(timestamp);
  const dateText = `${time.getFullYear()}-${num(time.getMonth() + 1)}-${num(time.getDate())}`;
  const timeText = `${num(time.getHours())}:${num(time.getMinutes())}`;
  const movable = !!handleProps;
  return (
    <time
      className="time"
      dateTime={time.toISOString()}
      css={timeStyle}
      title={dateText}
      data-movable={movable}
      {...handleProps}
    >
      <span className="text">{timeText}</span>
      <span>{movable && <Icon className="handle" sprite={handle} />}</span>
    </time>
  );
}

export default React.memo(ChatItemTime);
