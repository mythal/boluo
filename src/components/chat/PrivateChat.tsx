import React from 'react';
import { css } from '@emotion/core';

const style = css`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const PrivateChat = () => {
  return <div css={style}>这是私有频道，你没有加入或者被邀请。</div>;
};
