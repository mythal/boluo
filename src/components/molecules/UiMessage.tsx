import * as React from 'react';
import { css } from '@emotion/core';
import { errorColor, infoColor, spacingN, textLg, warnColor } from '../../styles/theme';
import { lighten } from 'polished';
import Button from '../atoms/Button';
import TextIcon from '../atoms/TextIcon';
import close from '../../assets/icons/x-circle.svg';
import styled from '@emotion/styled';
import { roundedPx } from '../../styles/atoms';

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
  grid-template-columns: 1fr auto;
  padding: ${spacingN(1)};
  margin-bottom: ${spacingN(2)};
  font-size: ${textLg};
  ${roundedPx}
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
      {dismiss && (
        <Button
          small
          css={css`
            float: right;
          `}
          iconOnly
          onClick={dismiss}
        >
          <TextIcon sprite={close} />
        </Button>
      )}
    </div>
  );
}

export default React.memo(UiMessage);
