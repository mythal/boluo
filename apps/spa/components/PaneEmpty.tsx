import { PaneSimpleBox } from './PaneSimpleBox';

export const PaneEmpty = () => {
  return (
    <PaneSimpleBox>
      <div className="text-text-subtle text-lg select-none">∅</div>
    </PaneSimpleBox>
  );
};
