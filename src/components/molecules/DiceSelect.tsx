import * as React from 'react';
import styled from '@emotion/styled';
import { controlHeight, p, textXl, widthFull } from '../../styles/atoms';

interface Props {
  defaultValue?: string;
}

export const Select = styled.select`
  ${widthFull};
  ${textXl};
  ${controlHeight};
  ${p(1)};
  filter: invert();
`;

function DiceSelect({ defaultValue }: Props, ref: React.Ref<HTMLSelectElement>) {
  return (
    <Select defaultValue={defaultValue || 'd20'} id="defaultDiceType" name="defaultDiceType" ref={ref}>
      <option value="d20">D20</option>
      <option value="d100">D100</option>
      <option value="d6">D6</option>
    </Select>
  );
}

export default React.forwardRef(DiceSelect);
