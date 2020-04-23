import * as React from 'react';
import { border, disableFilter, focusOutline, onDisabled, onFocus } from '../../styles/atoms';
import {
  inputBgColor,
  controlRounded,
  textColor,
  spacingN,
  textLg,
  errorColor,
  inputBorderColor,
} from '../../styles/theme';
import { lighten } from 'polished';
import styled from '@emotion/styled';

interface AdditionalProps {
  variant?: 'error' | 'normal';
}

type Props = AdditionalProps & React.InputHTMLAttributes<HTMLInputElement>;

const StyledInput = styled.input`
  background-color: ${inputBgColor};
  ${border(inputBorderColor)};
  padding: ${spacingN(1.5)};
  color: ${textColor};
  font-size: ${textLg};
  transition-property: all;
  transition-duration: 200ms;
  ${controlRounded};
  ${onFocus(focusOutline, { backgroundColor: lighten(0.05, inputBgColor) })};

  &[data-variant='error'] {
    background-color: ${errorColor};
  }
  ${onDisabled(disableFilter)}
`;

export default React.forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <StyledInput ref={ref} data-variant={props.variant} {...props} />;
});
