import * as RadixSwitch from '@radix-ui/react-switch';
import clsx from 'clsx';
import type { FC } from 'react';

// See https://www.radix-ui.com/docs/primitives/components/switch

interface Props {
  id?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const Switch: FC<Props> = ({ checked, onChange, id, disabled = false }) => (
  <RadixSwitch.Root
    checked={checked}
    onCheckedChange={onChange}
    disabled={disabled}
    className={clsx(
      'w-10 h-8 rounded-[2px] bg-pin-surface-500 relative inline-flex shadow-inner',
      'items-center state-checked:bg-pin-brand-600 flex-none transition-all duration-100 ease-in-out',
      disabled && 'contrast-50 brightness-75 cursor-not-allowed',
    )}
  >
    <RadixSwitch.Thumb
      id={id}
      className={clsx(
        'block w-3 h-6 state-unchecked:bg-white state-checked:bg-white rounded-[1px] shadow-sm',
        'transition-all duration-100 ease-out',
        'state-unchecked:translate-x-1 state-checked:translate-x-6',
      )}
    />
  </RadixSwitch.Root>
);
