import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { lighten } from 'polished';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { type Space } from '../../api/spaces';
import Lock from '../../assets/icons/lock.svg';
import { fontNormal, m, mR, mT, p, pX, pY, roundedPx, textXl, uiShadow } from '../../styles/atoms';
import { bgColor, textColor } from '../../styles/colors';
import { encodeUuid } from '../../utils/id';
import Icon from '../atoms/Icon';

interface Props {
  space: Space;
}

const cardStyle = css`
  background-color: ${lighten(0.05, bgColor)};
  background-position: right bottom;
  background-size: 60%;
  background-repeat: no-repeat;
  text-shadow: 0 1px 1px #000;
  min-height: 8rem;
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

const SpaceName = styled.h2(textXl, p(0), m(0), fontNormal);

function truncate(description: string): string {
  const length = 32;
  const firstLine = description.split(/\r?\n/, 1)[0];
  if (firstLine.length > length) {
    return firstLine.substr(0, length) + '…';
  }
  return firstLine;
}

function SpaceCard({ space }: Props) {
  return (
    <Link css={cardStyle} to={`/space/${encodeUuid(space.id)}`}>
      <SpaceName>
        {!space.isPublic && <Icon css={mR(1)} icon={Lock} />}
        {space.name}
      </SpaceName>
      <div css={[mT(2)]}>
        <small>{truncate(space.description)}</small>
      </div>
    </Link>
  );
}

export default SpaceCard;
