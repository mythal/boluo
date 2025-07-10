import styled from '@emotion/styled';
import React from 'react';
import RotateCw from '../../assets/icons/rotate-cw.svg';
import { spacingN, spin as spinStyle } from '../../styles/atoms';

export type SvgIcon = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

interface Props {
  icon: SvgIcon;
  title?: string;
  className?: string;
  noStrut?: boolean;
  spin?: boolean;
  loading?: boolean;
}

const Strut = styled.span`
  &[data-strut='true'] {
    &::before {
      /*
      * https://juejin.im/entry/5bc441a5f265da0aca333506
      * https://codepen.io/airen/pen/pZVvyL
      */
      content: '\u200b';
    }
    display: inline-flex;
    align-items: center;
  }
  font-size: 1em;

  padding: 0 ${spacingN(0.5)};
`;

function Icon({ icon: IconComponent, className, noStrut, title, spin, loading }: Props) {
  if (loading) {
    spin = true;
    IconComponent = RotateCw;
  }
  return (
    <Strut data-strut={!noStrut} title={title}>
      <IconComponent
        css={[spin ? spinStyle : undefined]}
        className={className}
        width="1em"
        height="1em"
        fill="currentColor"
      />
    </Strut>
  );
}

export default React.memo(Icon);
