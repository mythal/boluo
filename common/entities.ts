export interface BaseEntity {
  start: number;
  offset: number;
}

export interface Text extends BaseEntity {
  type: 'Text';
}

export interface Link extends BaseEntity {
  type: 'Link';
  href: string;
  title?: string;
}

export interface Roll extends BaseEntity {
  type: 'Roll';
}

export interface Strong extends BaseEntity {
  type: 'Strong';
}

export interface Emphasis extends BaseEntity {
  type: 'Emphasis';
}

export interface Mention extends BaseEntity {
  type: 'Mention';
  userId: string;
  self?: boolean;
}

export type Entity = Text | Link | Roll | Strong | Emphasis | Mention;
