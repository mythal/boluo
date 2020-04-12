import React from 'react';
import { cls } from '../utils';
import solidIcons from '../icons/solid.svg';

interface Props {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

function Icon({ name, className, style }: Props) {
  const href = `${solidIcons}#${name}`;
  return (
    <span className={cls('icon', className)}>
      <svg width="1em" style={style} height="1em">
        <use xlinkHref={href} />
      </svg>
    </span>
  );
}

export default React.memo(Icon);
