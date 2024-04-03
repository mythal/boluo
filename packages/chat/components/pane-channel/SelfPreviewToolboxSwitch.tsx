import type { SatelliteDish } from '@boluo/icons';
import { memo, type FC, type ReactNode } from 'react';

interface Props {
  checked: boolean;
  icon: typeof SatelliteDish;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  description?: string;
}

export const SelfPreviewToolboxSwitch = memo<Props>(({ checked, icon, onChange, children }) => {
  const Icon = icon;
  return (
    <label
      data-checked={checked}
      className="hover:bg-highest/5 border-transprent data-[checked=true]:bg-highest/5 group relative block w-full overflow-hidden rounded-sm p-1"
    >
      <div className="">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="text-xs leading-tight">{children}</div>
      </div>
      <Icon
        data-checked={checked}
        className="text-highest/25 data-[checked=true]:text-highest/70 absolute right-1 top-2 z-0 text-base"
      />
    </label>
  );
});

SelfPreviewToolboxSwitch.displayName = 'SelfPreviewToolboxSwitch';
