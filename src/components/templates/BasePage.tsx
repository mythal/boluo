import * as React from 'react';
import { css } from '@emotion/core';
import { mainWidth, margin0Auto, pX, pY } from '@/styles/atoms';
import Header from '../organisms/Header';

interface Props {
  children: React.ReactNode;
}

const mainStyle = css`
  ${[pX(6), pY(6)]};
`;

function BasePage({ children }: Props) {
  return (
    <div>
      <Header />
      <div css={[mainStyle]}>
        <div css={[mainWidth, margin0Auto]}>{children}</div>
      </div>
    </div>
  );
}

export default BasePage;
