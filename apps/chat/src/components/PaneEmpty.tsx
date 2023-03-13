import { PaneSimpleBox } from './PaneSimpleBox';

export const PaneEmpty = () => {
  return (
    <PaneSimpleBox>
      <div className="text-surface-300 select-none text-lg">∅</div>
    </PaneSimpleBox>
  );
};
