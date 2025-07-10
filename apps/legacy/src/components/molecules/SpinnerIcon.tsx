import React from 'react';
import Fan from '../../fan.svg';
import { spin } from '../../styles/atoms';
import Icon from '../atoms/Icon';

function SpinnerIcon() {
  return <Icon icon={Fan} css={spin} />;
}

export default React.memo(SpinnerIcon);
