import * as React from 'react';
import { Space } from '@/api/spaces';
import { Link } from 'react-router-dom';
import { css } from '@emotion/core';
import { fontNormal, m, mT, p, pX, pY, roundedMd, textXl, uiShadow } from '@/styles/atoms';
import { lighten } from 'polished';
import { encodeUuid } from '@/utils/id';
import styled from '@emotion/styled';
import nightSky from '../../assets/space-card-background.svg';
import { bgColor, textColor } from '@/styles/colors';

interface Props {
  space: Space;
}

const cardStyle = css`
  background-color: ${lighten(0.05, bgColor)};
  background-image: url(${nightSky.url});
  background-position: right bottom;
  background-size: 60%;
  background-repeat: no-repeat;
  text-shadow: 0 1px 1px #000;
  min-height: 8rem;
  ${uiShadow};
  ${roundedMd};
  ${pY(5)};
  ${pX(3)};
  text-decoration: none;
  color: ${textColor};

  &:hover {
    background-color: ${lighten(0.1, bgColor)};
  }
`;

const SpaceName = styled.h2(textXl, p(0), m(0), fontNormal);

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
