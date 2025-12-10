import { isLegacyEntity, type LegacyEntity } from './legacy-entities';

export interface BaseEntity {
  start: number;
  len: number;
}

export interface Text extends BaseEntity {
  type: 'Text';
}

export interface Link extends BaseEntity {
  type: 'Link';
  child: Text;
  href:
    | {
        start: number;
        len: number;
      }
    | string;
  title?: string;
}

export interface ExportLink extends BaseEntity {
  type: 'ExportLink';
  href: string;
  title?: string;
}

export interface Expr extends BaseEntity {
  type: 'Expr';
  node: ExprNode;
}

export interface Code extends BaseEntity {
  type: 'Code';
  child: Text;
}

export interface CodeBlock extends BaseEntity {
  type: 'CodeBlock';
  child: Text;
}

export interface Strong extends BaseEntity {
  type: 'Strong';
  child: Text;
}

export interface Emphasis extends BaseEntity {
  type: 'Emphasis';
  child: Text;
}

export interface StrongEmphasis extends BaseEntity {
  type: 'StrongEmphasis';
  child: Text;
}

export type Entity = Text | Link | Expr | Strong | Emphasis | StrongEmphasis | Code | CodeBlock;

export interface Unknown {
  type: 'Unknown';
}

export interface Roll {
  type: 'Roll';
  face: number;
  counter: number;
  filter?: ['LOW' | 'HIGH', number];
}

export interface CocRoll {
  type: 'CocRoll';
  subType: 'NORMAL' | 'BONUS' | 'BONUS_2' | 'PENALTY' | 'PENALTY_2';
  target?: ExprNode;
}

export interface FateRoll {
  type: 'FateRoll';
}

export interface DicePool {
  type: 'DicePool';
  counter: number;
  face: number;
  min: number;
  addition: number;
  critical?: number;
  fumble?: number;
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

export interface Max {
  type: 'Max';
  node: Roll;
}

export interface Min {
  type: 'Min';
  node: Roll;
}

export interface Repeat {
  type: 'Repeat';
  node: ExprNode;
  count: number;
}

export interface SubExpr {
  type: 'SubExpr';
  node: ExprNode;
}

export type ExprNode =
  | Roll
  | Binary
  | Num
  | Max
  | Min
  | SubExpr
  | CocRoll
  | FateRoll
  | DicePool
  | Repeat
  | Unknown;

export interface RollResult extends Roll {
  values: number[];
  filtered?: number[];
  value: number;
}

export interface CocRollResult extends CocRoll {
  targetValue?: number;
  value: number;
  rolled: number;
  modifiers: number[];
}

export interface FateResult extends FateRoll {
  value: number;
  values: [number, number, number, number];
}

export interface BinaryResult extends Binary {
  l: EvaluatedExprNode;
  r: EvaluatedExprNode;
  value: number;
}

export interface MaxResult extends Max {
  node: RollResult;
  value: number;
}

export interface MinResult extends Min {
  node: RollResult;
  value: number;
}

export interface SubExprResult extends SubExpr {
  evaluatedNode: EvaluatedExprNode;
  value: number;
}

export interface DicePoolResult extends DicePool {
  value: number;
  values: number[];
}

export interface RepeatResult extends Repeat {
  evaluated: EvaluatedExprNode[];
  value: number;
}

export interface UnknownResult extends Unknown {
  value: number;
}

export type EvaluatedExprNode =
  | RollResult
  | BinaryResult
  | Num
  | MaxResult
  | MinResult
  | SubExprResult
  | CocRollResult
  | FateResult
  | DicePoolResult
  | RepeatResult
  | UnknownResult;

export interface ExportExpr extends BaseEntity {
  type: 'Expr';
  node: EvaluatedExprNode;
  text: string;
  exprText: string;
}

export type ExportEntity =
  | ((Text | ExportLink | Strong | Emphasis | StrongEmphasis | Code | CodeBlock) & { text: string })
  | ExportExpr;

export const fromLegacyEntity = (legacy: LegacyEntity): Entity => {
  const { start, offset: len } = legacy;
  switch (legacy.type) {
    case 'Text':
      return { type: 'Text', start, len };
    case 'Link':
      return {
        type: 'Link',
        start,
        len,
        child: { type: 'Text', start, len },
        href: legacy.href,
        title: legacy.title,
      };
    case 'Expr':
      return { type: 'Expr', start, len, node: legacy.node };
    case 'Strong':
      return { type: 'Strong', start, len, child: { type: 'Text', start, len } };
    case 'Emphasis':
      return { type: 'Emphasis', start, len, child: { type: 'Text', start, len } };
    case 'Code':
      return { type: 'Code', start, len, child: { type: 'Text', start, len } };
    case 'CodeBlock':
      return { type: 'CodeBlock', start, len, child: { type: 'Text', start, len } };
  }
};

function isEntity(raw: unknown): raw is Entity {
  if (typeof raw !== 'object' || raw == null || !('type' in raw)) {
    return false;
  }
  return 'len' in raw && 'start' in raw;
}

export const fromRawEntities = (text: string, rawEntities: unknown[]): Entity[] => {
  if (rawEntities.length === 0) {
    return [{ type: 'Text', start: 0, len: text.length }];
  }
  const firstEntity = rawEntities[0];
  if (isLegacyEntity(firstEntity)) {
    return (rawEntities as LegacyEntity[]).map(fromLegacyEntity);
  } else if (isEntity(firstEntity)) {
    return rawEntities as Entity[];
  } else {
    return [{ type: 'Text', start: 0, len: text.length }];
  }
};
