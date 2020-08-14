import styled from '@emotion/styled';
import { textBase, textLg } from '@/styles/atoms';
import { darken } from 'polished';
import { textColor } from '@/styles/colors';

export const ChatItemContentContainer = styled.div`
  grid-area: content;
  line-height: 1.6em;

  &[data-action='true'] {
    font-style: italic;
  }

  &[data-in-game='true'] {
    ${textLg};
  }
  &[data-in-game='false'] {
    ${textBase};
    color: ${darken(0.1, textColor)};
  }
`;
