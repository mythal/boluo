import * as React from 'react';
import { css } from '@emotion/core';
import { textSm } from '../../styles/atoms';
import { darken } from 'polished';
import { textColor } from '../../styles/colors';

interface Props {
  timestamp: number;
}

export const timeStyle = css`
  grid-area: time;
  color: ${darken(0.6, textColor)};
  text-align: right;
  user-select: none;
  ${[textSm]};
`;

const num = (n: number) => (n > 9 ? String(n) : `0${n}`);

function ChatItemTime({ timestamp }: Props) {
  const time = new Date(timestamp);
  const dateText = `${time.getFullYear()}-${num(time.getMonth() + 1)}-${num(time.getDate())}`;
  const timeText = `${num(time.getHours())}:${num(time.getMinutes())}`;
  return (
    <time dateTime={time.toISOString()} css={timeStyle} title={dateText}>
      {timeText}
    </time>
  );
}

export default React.memo(ChatItemTime);
