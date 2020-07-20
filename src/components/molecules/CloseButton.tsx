import * as React from 'react';
import { css } from '@emotion/core';
import Icon from '../atoms/Icon';
import close from '../../assets/icons/x-circle.svg';
import { closeButtonActiveColor, closeButtonHoverColor, textColor } from '../../styles/atoms';

interface Props {
  onClick: () => void;
  className?: string;
}

const style = css`
  font-size: 1em;
  padding: 0.25em;
  border-radius: 100%;
  border: none;
  background-color: transparent;
  color: ${textColor};
  &:hover {
    background-color: ${closeButtonHoverColor};
  }
  &:active {
    background-color: ${closeButtonActiveColor};
  }
  &:focus {
    outline: none;
  }
`;

function CloseButton({ onClick, className }: Props) {
  return (
    <button css={style} className={className} onClick={() => onClick()}>
      <Icon sprite={close} />
    </button>
  );
}

export default CloseButton;
