import * as React from 'react';
import { disabled, focused, onDisabled } from '../../styles/atoms';
import { inputBgColor, controlRounded, textColor, spacingN, textLg, errorColor } from '../../styles/theme';
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
  transition-property: all;
  transition-duration: 200ms;
  ${controlRounded};
  &:focus {
    ${focused};
  }
  &[data-variant='error'] {
    background-color: ${errorColor};
  }
  ${onDisabled(disabled)}
`;

export default React.forwardRef<HTMLInputElement, Props>(function Input(props, ref) {
  return <StyledInput ref={ref} data-variant={props.variant} {...props} />;
});
