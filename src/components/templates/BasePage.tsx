import * as React from 'react';
import { css } from '@emotion/core';
import { headerBgColor, headerHeight, mainP, mainWidth, margin0Auto, spacingN } from '../../styles/atoms';
import Header from '../organisms/Header';

interface Props {
  children: React.ReactNode;
}

export const headerStyle = css`
  display: flex;
  align-items: center;
  justify-content: stretch;
  height: ${headerHeight};
  background-color: ${headerBgColor};
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.5);
`;

export const headerInnerStyle = css`
  display: flex;
  flex: 1 1 auto;
  margin: 0 auto;
  ${mainWidth};
  justify-content: space-between;
`;

export const headerNavStyle = css`
  a {
    margin-right: ${spacingN(1)};
    &:last-of-type {
      margin-right: 0;
    }
  }
`;

function BasePage({ children }: Props) {
  return (
    <div>
      <Header />
      <div css={[mainP]}>
        <div css={[mainWidth, margin0Auto]}>{children}</div>
      </div>
    </div>
  );
}

export default BasePage;
