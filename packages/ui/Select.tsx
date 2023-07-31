import * as BaseSelect from '@radix-ui/react-select';
import clsx from 'clsx';
import { Check, ChevronUp } from 'icons';
import type { FC } from 'react';
import Icon from './Icon';

// See https://www.radix-ui.com/docs/primitives/components/select

export interface SelectItem {
  label: string;
  value: string;
}

interface Props {
  items: SelectItem[];
  value: string;
  disabled?: boolean;
  id?: string;
  onChange: (newValue: string) => void;
}

export const Select: FC<Props> = ({ items, onChange, value, id, disabled = false }) => {
  return (
    <BaseSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
      <BaseSelect.Trigger
        id={id}
        className={clsx(
          'p-2 inline-flex min-w-[10em] h-10 items-center justify-between',
          'rounded bg-lowest border-1/2 hover-enabled:bg-surface-100 border-surface-300 hover:border-surface-800 state-open:border-surface-800',
          ' focus:outline-none focus:ring focus:ring-surface-200',
        )}
      >
        <BaseSelect.Value />
        <BaseSelect.Icon className='[[data-state="closed"]>&]:rotate-180 rotate-0 transform transition-transform duration-100'>
          <Icon icon={ChevronUp} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>

      <BaseSelect.Portal>
        <BaseSelect.Content className="bg-lowest border-1/2 border-pin-surface-600 rounded shadow-lg">
          <BaseSelect.ScrollUpButton>
            <Icon icon={ChevronUp} />
          </BaseSelect.ScrollUpButton>
          <BaseSelect.Viewport className="">
            {items.map(({ value, label }) => (
              <BaseSelect.Item
                key={value}
                value={value}
                className={clsx(
                  'flex justify-between',
                  'hightlighted:bg-surface-200 px-4 py-2 hightlighted:outline-none select-none',
                )}
              >
                <BaseSelect.ItemText>{label}</BaseSelect.ItemText>
                <BaseSelect.ItemIndicator className="w-4 inline-block">
                  <Icon icon={Check} />
                </BaseSelect.ItemIndicator>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Viewport>
          <BaseSelect.ScrollDownButton />
        </BaseSelect.Content>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
};
