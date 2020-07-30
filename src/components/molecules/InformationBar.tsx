import * as React from 'react';
import { css } from '@emotion/core';
import { lighten } from 'polished';
import styled from '@emotion/styled';
import { errorColor, infoColor, roundedPx, spacingN, successColor, textLg, uiShadow, warnColor } from '@/styles/atoms';
import CloseButton from './CloseButton';
import { InformationLevel } from '@/actions/information';

interface Props {
  variant: InformationLevel;
  children: React.ReactNode;
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
  ${textLg};
  ${roundedPx};

  ${uiShadow};
  &[data-variant='INFO'] {
    ${colorStyle(infoColor)};
  }
  &[data-variant='ERROR'] {
    ${colorStyle(errorColor)};
  }
  &[data-variant='SUCCESS'] {
    ${colorStyle(warnColor)};
  }
  &[data-variant='WARNING'] {
    ${colorStyle(successColor)};
  }
`;

function InformationBar({ variant, className, dismiss, children }: Props) {
  return (
    <div css={style} data-variant={variant} className={className}>
      <Container>{children}</Container>
      {dismiss && <CloseButton onClick={dismiss} />}
    </div>
  );
}

export default React.memo(InformationBar);
