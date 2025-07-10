import { css } from '@emotion/react';
import { darken, lighten } from 'polished';
import * as React from 'react';
import { Link } from 'react-router-dom';
import PlusCircle from '../../assets/icons/plus-circle.svg';
import { flex, pY, roundedPx, text3Xl } from '../../styles/atoms';
import { bgColor, textColor } from '../../styles/colors';
import Icon from '../atoms/Icon';

const style = css`
  ${[flex, roundedPx, pY(4), text3Xl]};
  background-color: ${lighten(0.025, bgColor)};
  color: ${darken(0.1, textColor)};
  text-decoration: none;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: ${lighten(0.05, bgColor)};
  }
`;

function NewSpaceCard() {
  return (
    <Link to="/space/new" css={style}>
      <Icon icon={PlusCircle} />
    </Link>
  );
}

export default NewSpaceCard;
