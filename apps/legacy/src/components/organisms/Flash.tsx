import * as React from 'react';
import { dismissFlash } from '../../actions';
import { type Information } from '../../information';
import { type FlashState } from '../../reducers/flash';
import { useDispatch } from '../../store';
import { Portal } from '../atoms/Portal';
import InformationBar from '../molecules/InformationBar';

interface Props {
  flashState: FlashState;
}

function Flash({ flashState }: Props) {
  const dispatch = useDispatch();

  const informationBarMap = (info: Information) => (
    <InformationBar
      className="my-2 min-w-40 -translate-x-1/2 text-[0.875rem]"
      key={info.id}
      variant={info.level}
      dismiss={() => dispatch(dismissFlash(info.id))}
    >
      {info.content}
    </InformationBar>
  );

  return (
    <Portal>
      <div className="fixed top-0 left-1/2 z-[200]">
        {flashState.reverse().valueSeq().map(informationBarMap)}
      </div>
    </Portal>
  );
}

export default Flash;
