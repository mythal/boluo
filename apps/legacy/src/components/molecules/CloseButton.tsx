import { css } from '@emotion/react';
import * as React from 'react';
import XCircle from '../../assets/icons/x-circle.svg';
import { closeButtonActiveColor, closeButtonHoverColor, textColor } from '../../styles/colors';
import Icon from '../atoms/Icon';

interface Props {
  onClick: () => void;
  className?: string;
}

const style = css`
  font-size: 1em;
  width: 1.4em;
  line-height: 1em;
  height: 1.4em;
  border-radius: 50%;
  border: none;
  padding: 0;
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
      <Icon icon={XCircle} />
    </button>
  );
}

export default CloseButton;
