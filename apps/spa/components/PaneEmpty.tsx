import { PaneSimpleBox } from './PaneSimpleBox';

export const PaneEmpty = () => {
  return (
    <PaneSimpleBox>
      <div className="text-text-subtle select-none text-lg">∅</div>
    </PaneSimpleBox>
  );
};
