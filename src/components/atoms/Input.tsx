import {
  controlRounded,
  disabled,
  duration200,
  errorColor,
  focused,
  inputBgColor,
  spacingN,
  textColor,
  textLg,
  uiShadow,
  widthFull,
} from '../../styles/atoms';
import styled from '@emotion/styled';
import { css } from '@emotion/core';

interface DataAttributes {
  'data-variant'?: 'error' | 'normal';
}

export const inputStyle = css`
  background-color: ${inputBgColor};
  border: none;
  padding: ${spacingN(2)};
  color: ${textColor};
  ${textLg};
  ${uiShadow};
  transition-property: all;
  ${duration200};
  ${controlRounded};
  ${widthFull};
  &:focus {
    ${focused};
  }
  &:disabled {
    ${disabled};
  }
  &[data-variant='error'] {
    background-color: ${errorColor};
  }
`;

const Input = styled.input<DataAttributes>`
  ${inputStyle}
`;

export default Input;
