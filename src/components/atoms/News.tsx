import styled from '@emotion/styled';
import { p, roundedSm } from '@/styles/atoms';
import { blue } from '@/styles/colors';

export const News = styled.div`
  ${[roundedSm, p(2)]};
  background-color: ${blue['900']};
  border: 1px solid ${blue['800']};
`;
