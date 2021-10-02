import React from 'react';
import { css } from '@emotion/core';

interface Props {
  className?: string;
}

const style = css`
  font-style: italic;
`;

export const BroadcastAreClosed = ({ className }: Props) => {
  return (
    <span css={style} className={className}>
      [预览广播已关闭]
    </span>
  );
};
