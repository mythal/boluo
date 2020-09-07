import styled from '@emotion/styled';
import { darken } from 'polished';
import { gray, textColor } from '../../styles/colors';
import { chatContentLineHeight, chatSplitLine } from './styles';
import { mL, pX, pY } from '../../styles/atoms';

export const ChatItemContentContainer = styled.div`
  grid-area: content;
  ${[chatContentLineHeight, pY(2), pX(3), mL(2), chatSplitLine]};

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
