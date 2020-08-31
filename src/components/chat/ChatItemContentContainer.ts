import styled from '@emotion/styled';
import { darken } from 'polished';
import { textColor } from '../../styles/colors';
import { chatContentLineHeight } from './styles';

export const ChatItemContentContainer = styled.div`
  grid-area: content;
  ${chatContentLineHeight};

  &[data-action='true'] {
    font-style: italic;
  }

  &[data-in-game='false'] {
    color: ${darken(0.1, textColor)};
  }
  &[data-folded='true'] {
    text-decoration: line-through;
    filter: grayscale(50%) brightness(50%);
  }
`;
