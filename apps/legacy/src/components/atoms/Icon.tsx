import React from 'react';
import RotateCw from '@boluo/icons/legacy/RotateCw';
import { cls } from '../../utils/classnames';

export type SvgIcon = React.FunctionComponent<React.SVGProps<SVGSVGElement>>;

interface Props {
  icon: SvgIcon;
  title?: string;
  className?: string;
  noStrut?: boolean;
  spin?: boolean;
  loading?: boolean;
}

function Icon({ icon: IconComponent, className, noStrut, title, spin, loading }: Props) {
  if (loading) {
    spin = true;
    IconComponent = RotateCw;
  }
  return (
    <span
      className="legacy-icon-strut px-0.5 text-[1em] data-[strut=true]:inline-flex data-[strut=true]:items-center"
      data-strut={!noStrut}
      title={title}
    >
      <IconComponent
        className={cls(className, spin && 'animate-legacy-spin')}
        width="1em"
        height="1em"
      />
    </span>
  );
}

export default React.memo(Icon);
