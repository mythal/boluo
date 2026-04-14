import type React from 'react';

export type Empty = Record<string, never>;

export interface StyleProps {
  className?: string | undefined;
}

export type StringKeyOf<T> = Extract<keyof T, string>;

export type DataAttr<T> = { [P in StringKeyOf<T> as `data-${P}`]?: T[P] };

export interface ChildrenProps {
  children: React.ReactNode;
}
