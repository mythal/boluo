import styled from '@emotion/styled';
import { spacingN, textBase } from '../../styles/atoms';
import { textColor } from '../../styles/colors';

export const Text = styled.p`
  color: ${textColor};
  font-size: ${textBase};
  margin: 0;
  line-height: 1.75rem;
  padding: ${spacingN(1)} 0;
`;

export default Text;
