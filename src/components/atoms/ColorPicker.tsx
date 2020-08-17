import * as React from 'react';
import styled from '@emotion/styled';
import { controlHeight, controlRounded } from '../../styles/atoms';

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorDisplay = styled.div`
  ${[controlHeight, controlRounded]};
  box-shadow: 0 0 2px #000000 inset;
`;

const ColorPicker: React.ForwardRefRenderFunction<HTMLInputElement, Props> = ({ value, onChange, id }, ref) => {
  return (
    <React.Fragment>
      <label htmlFor={id}>
        <ColorDisplay css={{ backgroundColor: value }} />
      </label>
      <input id={id} type="color" onChange={(e) => onChange(e.target.value)} ref={ref} hidden />
    </React.Fragment>
  );
};

export default React.forwardRef(ColorPicker);
