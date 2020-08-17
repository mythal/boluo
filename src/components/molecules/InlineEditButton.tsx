import * as React from 'react';
import Button from '../atoms/Button';
import { css } from '@emotion/core';
import { pX, pY, textSm } from '../../styles/atoms';

interface Props {
  className?: string;
}

const style = css`
  ${[pX(1), pY(1), textSm]};
  min-width: unset;
`;

function InlineEditButton({ className }: Props) {
  return (
    <Button css={style} className={className}>
      编辑
    </Button>
  );
}

export default InlineEditButton;
