import { css } from '@emotion/react';
import * as React from 'react';
import {
  fontMono,
  fontNormal,
  mL,
  pX,
  pY,
  relative,
  roundedSm,
  textSm,
  textXs,
  uiShadow,
} from '../../styles/atoms';
import { black, gray, white } from '../../styles/colors';
import { parseDateString } from '../../utils/helper';
import { dateTimeFormat, timeFormat } from '../../utils/time';

interface Props {
  created: string;
  modified: string;
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
  const created = parseDateString(props.created);
  const modified = parseDateString(props.modified);
  return (
    <time css={style}>
      <div css={timeTooltip} className="time-tooltip">
        <div>{dateTimeFormat(created)}</div>
        {props.created !== props.modified && (
          <div css={textXs}>修改于 {dateTimeFormat(modified)}</div>
        )}
      </div>
      {timeFormat(created)}
    </time>
  );
}

export default MessageTime;
