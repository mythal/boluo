import * as React from 'react';
import { controlRounded, disabled, duration200, focused, uiShadow } from '../../styles/atoms';
import { inputBgColor, textColor, spacingN, textLg, errorColor } from '../../styles/theme';
import styled from '@emotion/styled';

interface AdditionalProps {
  variant?: 'error' | 'normal';
}

type Props = AdditionalProps & React.InputHTMLAttributes<HTMLInputElement>;

const StyledInput = styled.input`
  background-color: ${inputBgColor};
  border: none;
  padding: ${spacingN(2)};
  color: ${textColor};
  font-size: ${textLg};
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

export default React.forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <StyledInput ref={ref} data-variant={props.variant} {...props} />;
});
