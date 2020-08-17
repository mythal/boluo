import { disabled, roundedSm, spacingN, textLg, widthFull } from '../../styles/atoms';
import styled from '@emotion/styled';
import { css } from '@emotion/core';
import { errorColor, gray, inputBgColor, textColor } from '../../styles/colors';

interface DataAttributes {
  'data-variant'?: 'error' | 'normal';
}

export const inputStyle = css`
  background-color: ${inputBgColor};
  padding: ${spacingN(2)};
  color: ${textColor};
  ${textLg};
  transition: all 100ms;
  ${roundedSm};
  ${widthFull};
  border: 1px solid ${gray['700']};
  &:hover {
    border-color: ${gray['400']};
  }
  &:focus {
    outline: none;
    border-color: ${gray['500']};
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
