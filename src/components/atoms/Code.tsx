import React, { useRef } from 'react';
import { black, primary } from '../../styles/colors';
import { fontMono, fontNormal, pX, pY, roundedSm, textSm } from '../../styles/atoms';
import { css } from '@emotion/core';

const style = css`
  background-color: ${black};
  cursor: pointer;
  ${[roundedSm, textSm, fontNormal, fontMono, pX(2), pY(1)]};
  &:hover {
    box-shadow: 0 0 0 1px ${primary['700']} inset;
  }
  &:active {
    box-shadow: 0 0 0 1px ${primary['500']} inset;
  }
`;

interface Props {
  children: React.ReactNode;
}

export function Code({ children }: Props) {
  const ref = useRef<HTMLElement>(null);

  const onClick = () => {
    const node = ref.current!;
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand('copy');
    selection.removeAllRanges();
  };

  return (
    <code ref={ref} onClick={onClick} css={style}>
      {children}
    </code>
  );
}
