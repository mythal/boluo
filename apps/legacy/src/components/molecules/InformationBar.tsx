import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { lighten } from 'polished';
import * as React from 'react';
import { type InformationLevel } from '../../information';
import { roundedSm, spacingN, textBase, textXl, uiShadow } from '../../styles/atoms';
import {
  informationErrorColor,
  informationInfoColor,
  informationSuccessColor,
  informationWarnColor,
} from '../../styles/colors';
import CloseButton from './CloseButton';

interface Props {
  variant: InformationLevel;
  children: React.ReactNode;
  className?: string;
  dismiss?: () => void;
}

const colorStyle = (color: string) => css`
  background-color: ${color};
  border: 1px solid ${lighten(0.15, color)};

  &:hover {
    border-color: ${lighten(0.3, color)};
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
  ${textBase};
  ${roundedSm};

  ${uiShadow};
  &[data-variant='INFO'] {
    ${colorStyle(informationInfoColor)};
  }
  &[data-variant='ERROR'] {
    ${colorStyle(informationErrorColor)};
  }
  &[data-variant='SUCCESS'] {
    ${colorStyle(informationWarnColor)};
  }
  &[data-variant='WARNING'] {
    ${colorStyle(informationSuccessColor)};
  }
`;

function InformationBar({ variant, className, dismiss, children }: Props) {
  return (
    <div css={style} data-variant={variant} className={className}>
      <Container>{children}</Container>
      {dismiss && <CloseButton css={textXl} onClick={dismiss} />}
    </div>
  );
}

export default React.memo(InformationBar);
