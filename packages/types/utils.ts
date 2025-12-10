import type React from 'react';

export type Empty = Record<string, never>;

export interface StyleProps {
  className?: string | undefined;
}

export type DataAttr<T> = { [P in keyof T & string as `data-${P}`]?: T[P] };

export interface ChildrenProps {
  children: React.ReactNode;
}
