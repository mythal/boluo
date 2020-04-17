import * as React from 'react';
import { css } from '@emotion/core';
import { focusOutline, onFocus } from '../../styles/atoms';
import { inputBgColor, controlRounded, textColor, spacingN, textLg } from '../../styles/theme';
import { lighten } from 'polished';

interface Props {}

const style = css`
  background-color: ${inputBgColor};
  border: none;
  padding: ${spacingN(1.5)};
  color: ${textColor};
  font-size: ${textLg};
  transition-property: all;
  transition-duration: 200ms;
  ${controlRounded};
  ${onFocus(focusOutline, { backgroundColor: lighten(0.05, inputBgColor) })};
`;

export function Input(props: Props) {
  return <input css={style} />;
}
