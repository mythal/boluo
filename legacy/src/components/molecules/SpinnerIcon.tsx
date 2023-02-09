import React from 'react';
import fan from '../../assets/icons/fan.svg';
import { spin } from '../../styles/atoms';
import Icon from '../atoms/Icon';

function SpinnerIcon() {
  return <Icon sprite={fan} css={spin} />;
}

export default React.memo(SpinnerIcon);
