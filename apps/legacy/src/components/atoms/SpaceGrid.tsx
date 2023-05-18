import styled from '@emotion/styled';
import { grid, spacingN } from '../../styles/atoms';

export const SpaceGrid = styled.div`
  ${grid};
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${spacingN(2)};
`;
