import * as React from 'react';
import { css } from '@emotion/core';
import { chatRight } from '@/styles/atoms';

const container = css`
  ${chatRight};
  background-color: sienna;
`;

function ChatHome() {
  return <div css={container} />;
}

export default ChatHome;
