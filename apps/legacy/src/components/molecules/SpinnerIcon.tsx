import React from 'react';
import Fan from '@boluo/icons/legacy/Fan';
import Icon from '../atoms/Icon';

function SpinnerIcon() {
  return <Icon className="animate-legacy-spin" icon={Fan} />;
}

export default React.memo(SpinnerIcon);
