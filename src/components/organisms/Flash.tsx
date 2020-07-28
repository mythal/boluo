import * as React from 'react';
import { InformationState } from '../../reducers/information';
import { Portal } from '../atoms/Portal';
import InformationBar from '../molecules/InformationBar';
import { css } from '@emotion/core';
import { useDispatch } from '../Provider';
import { dismissInformation, Information } from '../../actions/information';

interface Props {
  information: InformationState;
}

const container = css`
  position: fixed;
  top: 0;
`;

function Flash({ information }: Props) {
  const dispatch = useDispatch();

  const informationBarMap = (info: Information) => (
    <InformationBar key={info.id} variant={info.level} dismiss={() => dispatch(dismissInformation(info.id))}>
      {info.content}
    </InformationBar>
  );

  return (
    <Portal>
      <div css={container}>{information.valueSeq().map(informationBarMap)}</div>
    </Portal>
  );
}

export default Flash;
