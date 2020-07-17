import * as React from 'react';
import { css } from '@emotion/core';
import { errorColor, infoColor, spacingN, textLg, warnColor } from '../../styles/theme';
import { lighten } from 'polished';
import styled from '@emotion/styled';
import { roundedPx, uiShadow } from '../../styles/atoms';
import CloseButton from './CloseButton';

interface Props {
  variant: 'warning' | 'info' | 'error';
  children: React.ReactChild;
  className?: string;
  dismiss?: () => void;
}

const colorStyle = (color: string) => css`
  background-color: ${color};

  &:hover {
    background-color: ${lighten(0.1, color)};
  }
`;

const Container = styled.div`
  padding: ${spacingN(2)};
`;

const style = css`
  display: grid;
  align-items: center;
  grid-template-columns: 1fr auto;
  padding: ${spacingN(1)};
  font-size: ${textLg};
  ${roundedPx};

  ${uiShadow};
  &[data-variant='info'] {
    ${colorStyle(infoColor)};
  }
  &[data-variant='error'] {
    ${colorStyle(errorColor)};
  }

  &[data-variant='warning'] {
    ${colorStyle(warnColor)};
  }
`;

function UiMessage({ variant, className, dismiss, children }: Props) {
  return (
    <div css={style} data-variant={variant} className={className}>
      <Container>{children}</Container>
      {dismiss && <CloseButton onClick={dismiss} />}
    </div>
  );
}

export default React.memo(UiMessage);
