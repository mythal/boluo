'use client';
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
    <div className="bg-surface-muted px-pane flex">
      {tabItems.map((tabItem) => {
        const active = tabItem.id === value;
        return (
          <button
            key={tabItem.id}
            className={clsx(
              'cursor-pointer px-4 py-2',
              active ? 'bg-surface-raised text-text-primary' : 'text-text-muted',
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
