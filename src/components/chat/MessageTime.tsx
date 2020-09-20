import * as React from 'react';
import { css } from '@emotion/core';
import { dateTimeFormat, timeFormat } from '../../utils/time';
import { fontMono, fontNormal, mL, pX, pY, relative, roundedSm, textSm, textXs, uiShadow } from '../../styles/atoms';
import { black, gray, white } from '../../styles/colors';

interface Props {
  created: number;
  modified: number;
}

const style = css`
  ${[textXs, relative, mL(1), fontMono, fontNormal]};
  color: ${gray['600']};
  clear: right;
  float: right;

  & .time-tooltip {
    visibility: hidden;
  }

  &:hover .time-tooltip {
    visibility: visible;
  }
`;

const timeTooltip = css`
  ${[textSm, pY(1), pX(2), roundedSm, uiShadow, fontNormal]};
  color: ${white};
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 10;
  width: max-content;
  background-color: ${black};
`;

function MessageTime(props: Props) {
  const created = new Date(props.created);
  const modified = new Date(props.modified);
  return (
    <time css={style}>
      <div css={timeTooltip} className="time-tooltip">
        <div>{dateTimeFormat(created)}</div>
        {props.created !== props.modified && <div css={textXs}>修改于 {dateTimeFormat(modified)}</div>}
      </div>
      {timeFormat(created)}
    </time>
  );
}

export default MessageTime;
