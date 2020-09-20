import styled from '@emotion/styled';
import { darken } from 'polished';
import { gray, textColor } from '../../styles/colors';
import { chatContentLineHeight } from './styles';
import { pY } from '../../styles/atoms';

export const ChatItemContentContainer = styled.div`
  grid-area: content;
  ${[chatContentLineHeight, pY(2)]};

  &[data-action='true'] {
    font-style: italic;
  }

  &[data-in-game='false'] {
    color: ${darken(0.1, textColor)};
  }
  &[data-folded='true'] {
    text-decoration: line-through;
    color: ${gray['600']};
  }
`;
