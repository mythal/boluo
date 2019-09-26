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

export interface EntityUser {
  id: string;
  name: string;
}

export interface Mention extends BaseEntity {
  type: 'Mention';
  user: EntityUser;
  self?: boolean;
}

export type Entity = Text | Link | Expr | Strong | Emphasis | Mention;

export interface Roll {
  type: 'Roll';
  face?: number;
  counter: number;
}

export interface Num {
  type: 'Num';
  value: number;
}

export type Operator = '+' | '-' | '×' | '÷';

export interface Binary {
  type: 'Binary';
  op: Operator;
  l: ExprNode;
  r: ExprNode;
}

export type ExprNode = Roll | Binary | Num;
