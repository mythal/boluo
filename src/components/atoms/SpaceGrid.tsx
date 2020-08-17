import styled from '@emotion/styled';
import { breakpoint, grid, mediaQuery, spacingN } from '@/styles/atoms';

export const SpaceGrid = styled.div`
  ${grid};
  grid-template-columns: repeat( auto-fit, minmax(160px, 1fr) );
  gap: ${spacingN(2)};
  // ${mediaQuery(breakpoint.sm)} {
  //   grid-template-columns: repeat(3, 1fr);
  // }
  // ${mediaQuery(breakpoint.sm)} {
  //   grid-template-columns: repeat(4, 1fr);
  // }
`;
