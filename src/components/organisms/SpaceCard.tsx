import * as React from 'react';
import { Space } from '../../api/spaces';
import { Link } from 'react-router-dom';
import { css } from '@emotion/core';
import { bgColor, m, mT, p, pX, pY, roundedPx, textColor, textXl, uiShadow } from '../../styles/atoms';
import { lighten } from 'polished';
import { encodeUuid } from '../../utils/id';
import styled from '@emotion/styled';

interface Props {
  space: Space;
}

const cardStyle = css`
  background-color: ${lighten(0.05, bgColor)};
  ${uiShadow};
  ${roundedPx};
  ${pY(5)};
  ${pX(3)};
  text-decoration: none;
  color: ${textColor};

  &:hover {
    background-color: ${lighten(0.1, bgColor)};
  }
`;

const SpaceName = styled.h2(textXl, p(0), m(0));

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
      <SpaceName>{space.name}</SpaceName>
      <div css={[mT(2)]}>
        <small>{truncate(space.description)}</small>
      </div>
    </Link>
  );
}

export default SpaceCard;
