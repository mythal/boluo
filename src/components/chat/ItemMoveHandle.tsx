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
  handleProps: DraggableProvidedDragHandleProps;
}

export const handleStyle = css`
  grid-area: time;
  color: ${darken(0.6, textColor)};
  display: flex;
  flex-direction: row-reverse;
  justify-content: center;
  align-items: center;
  ${[textXs, roundedMd, p(1)]};

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:focus {
    outline: none;
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const num = (n: number) => (n > 9 ? String(n) : `0${n}`);

function ItemMoveHandle({ timestamp, handleProps }: Props) {
  const time = new Date(timestamp);
  const dateText = `${time.getFullYear()}-${num(time.getMonth() + 1)}-${num(time.getDate())} ${num(
    time.getHours()
  )}:${num(time.getMinutes())}`;
  return (
    <time className="time" dateTime={time.toISOString()} css={handleStyle} title={dateText} {...handleProps}>
      <span>
        <Icon className="handle" sprite={handle} />
      </span>
    </time>
  );
}

export default React.memo(ItemMoveHandle);
