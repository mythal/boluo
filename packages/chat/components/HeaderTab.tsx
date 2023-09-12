import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: ReactNode;
}

interface Props<T> {
  tabItems: TabItem[];
  value: T;
  onChange: (value: T) => void;
}

export const HeaderTab = <T extends string = string>({ tabItems, value, onChange }: Props<T>) => {
  return (
    <div className="flex bg-surface-100">
      {tabItems.map((tabItem) => {
        const active = tabItem.id === value;
        return (
          <button
            key={tabItem.id}
            className={clsx(
              'cursor-pointer px-4 py-2 border-t-1/2',
              active ? 'bg-surface-50 border-brand-400' : 'hover:border-brand-200 border-surface-100',
            )}
            onClick={() => onChange(tabItem.id as T)}
          >
            {tabItem.label}
          </button>
        );
      })}
    </div>
  );
};
