import * as React from 'react';
import { css } from '@emotion/core';
import { p, pY, roundedMd, textXs } from '../../styles/atoms';
import { darken } from 'polished';
import { textColor } from '../../styles/colors';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import Icon from '../atoms/Icon';
import handle from '../../assets/icons/handle.svg';

interface Props {
  timestamp: number;
  handleProps: DraggableProvidedDragHandleProps;
}

export const handleContainerStyle = css`
  grid-area: time;
  color: ${darken(0.6, textColor)};
  display: flex;
  justify-content: stretch;
  align-items: stretch;
  ${[textXs, roundedMd, pY(1)]};
`;

const handleStyle = css`
  ${[p(1), roundedMd]};
  display: flex;
  align-items: center;
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
    <time dateTime={time.toISOString()} css={handleContainerStyle} title={dateText}>
      <div css={handleStyle} {...handleProps}>
        <Icon className="handle" sprite={handle} />
      </div>
    </time>
  );
}

export default React.memo(ItemMoveHandle);
