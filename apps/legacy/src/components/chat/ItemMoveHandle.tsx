import { css } from '@emotion/react';
import { darken } from 'polished';
import * as React from 'react';
import { type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import Handle from '../../assets/icons/handle.svg';
import { p, pY, roundedMd, textXs } from '../../styles/atoms';
import { textColor } from '../../styles/colors';
import { parseDateString } from '../../utils/helper';
import { dateTimeFormat } from '../../utils/time';
import Icon from '../atoms/Icon';

interface Props {
  timestamp: string;
  handleProps: DraggableProvidedDragHandleProps;
}

export const handleContainerStyle = css`
  grid-area: handle;
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

function ItemMoveHandle({ timestamp, handleProps }: Props) {
  const now = parseDateString(timestamp);
  return (
    <time dateTime={now.toISOString()} css={handleContainerStyle} title={dateTimeFormat(now)}>
      <div css={handleStyle} {...handleProps}>
        <Icon className="Handle" icon={Handle} />
      </div>
    </time>
  );
}

export default React.memo(ItemMoveHandle);
