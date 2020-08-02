import * as React from 'react';
import styled from '@emotion/styled';

interface Props {
  text: string;
  action: boolean;
}

const Content = styled.div`
  grid-area: content;

  &[data-action='true'] {
    font-style: italic;
  }
`;

function ChatItemContent({ text, action }: Props) {
  return <Content data-action={action}>{text}</Content>;
}

export default ChatItemContent;
