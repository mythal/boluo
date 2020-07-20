import * as React from 'react';
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
} from '../../styles/atoms';
import styled from '@emotion/styled';

interface DataAttributes {
  'data-variant'?: 'error' | 'normal';
}

const Input = styled.input<DataAttributes>`
  background-color: ${inputBgColor};
  border: none;
  padding: ${spacingN(2)};
  color: ${textColor};
  ${textLg};
  ${uiShadow};
  transition-property: all;
  ${duration200};
  ${controlRounded};
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

export default Input;
