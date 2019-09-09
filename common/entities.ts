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

export interface Expr extends BaseEntity {
  type: 'Expr';
  node: ExprNode;
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

export type Entity = Text | Link | Expr | Strong | Emphasis | Mention;

export interface Roll {
  type: 'Roll';
  face?: number;
  counter: number;
}

export interface Number {
  type: 'Number';
  value: number;
}

export interface Add {
  type: 'Add';
  a: ExprNode;
  b: ExprNode;
}

export type ExprNode = Roll | Add | Number;
