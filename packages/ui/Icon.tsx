import type { Close } from 'icons';
import React from 'react';

interface Props {
  icon: typeof Close;
  className?: string;
  noStrut?: boolean;
  label?: string | undefined;
}

const Icon: React.FC<Props> = ({ icon, noStrut = false, className, label }: Props) => {
  const Icon = icon;
  const loaded = <Icon aria-hidden role="img" width="1em" height="1em" className={className} aria-label={label} />;
  if (noStrut) {
    return loaded;
  } else {
    return <span className="inline-flex items-center before:content-['\200b']">{loaded}</span>;
  }
};
Icon.displayName = 'Icon';
export default React.memo(Icon);
