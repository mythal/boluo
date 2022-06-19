import * as React from 'react';
import { Portal } from '../atoms/Portal';
import InformationBar from '../molecules/InformationBar';
import { css } from '@emotion/core';
import { useDispatch } from '../../store';
import { mY, textSm } from '../../styles/atoms';
import { Information } from '../../information';
import { FlashState } from '../../reducers/flash';
import { dismissFlash } from '../../actions';

interface Props {
  flashState: FlashState;
}

const container = css`
  position: fixed;
  top: 0;
  left: 50%;
  z-index: 200;
`;

const flash = css`
  ${[textSm, mY(2)]};
  transform: translateX(-50%);
  min-width: 10rem;
`;

function Flash({ flashState }: Props) {
  const dispatch = useDispatch();

  const informationBarMap = (info: Information) => (
    <InformationBar css={flash} key={info.id} variant={info.level} dismiss={() => dispatch(dismissFlash(info.id))}>
      {info.content}
    </InformationBar>
  );

  return (
    <Portal>
      <div css={container}>{flashState.reverse().valueSeq().map(informationBarMap)}</div>
    </Portal>
  );
}

export default Flash;
