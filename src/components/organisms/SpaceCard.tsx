import * as React from 'react';
import { Space } from '../../api/spaces';
import { Link } from 'react-router-dom';
import { css } from '@emotion/core';
import { bgColor, mY, p, pX, pY, roundedPx, textColor, textXl, uiShadow } from '../../styles/atoms';
import { lighten } from 'polished';
import { encodeUuid } from '../../utils/id';

interface Props {
  space: Space;
}

const cardStyle = css`
  background-color: ${lighten(0.05, bgColor)};
  ${uiShadow};
  ${roundedPx};
  ${pY(3)};
  ${pX(4)};
  text-decoration: none;
  color: ${textColor};

  &:hover {
    background-color: ${lighten(0.1, bgColor)};
  }
`;

const nameStyle = css`
  ${textXl};
  ${mY(1)};
`;

function truncate(description: string): string {
  const length = 32;
  const firstLine = description.split('\n', 1)[0];
  if (firstLine.length > length) {
    return firstLine.substr(0, length) + '…';
  }
  return firstLine;
}

function SpaceCard({ space }: Props) {
  return (
    <Link css={cardStyle} to={`/space/${encodeUuid(space.id)}`}>
      <p css={nameStyle}>{space.name}</p>
      <div>
        <small>{truncate(space.description)}</small>
      </div>
    </Link>
  );
}

export default SpaceCard;
