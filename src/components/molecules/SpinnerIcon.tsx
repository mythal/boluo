import React from 'react';
import Icon from '../atoms/Icon';
import fan from '@/assets/icons/fan.svg';
import { spin } from '@/styles/atoms';

function SpinnerIcon() {
  return <Icon sprite={fan} css={spin} />;
}

export default React.memo(SpinnerIcon);
