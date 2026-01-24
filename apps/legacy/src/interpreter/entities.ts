import type {
  CocRollResult as ApiCocRollResult,
  DicePoolResult as ApiDicePoolResult,
  Entity as ApiEntity,
  EntityOf,
  EvaluatedExprNode as ApiEvaluatedExprNode,
  ExprNode as ApiExprNode,
  FateResult as ApiFateResult,
  Operator,
  RepeatResult as ApiRepeatResult,
  RollResult as ApiRollResult,
  Span,
} from '@boluo/api';
import { isLegacyEntity, type LegacyEntity } from './legacy-entities';

export type Entity = ApiEntity;
export type ExprNode = ApiExprNode;
export type EvaluatedExprNode = ApiEvaluatedExprNode;
export type Text = EntityOf<'Text'>;
export type Link = EntityOf<'Link'>;
export type Expr = EntityOf<'Expr'>;
export type Code = EntityOf<'Code'>;
export type CodeBlock = EntityOf<'CodeBlock'>;
export type Strong = EntityOf<'Strong'>;
export type Emphasis = EntityOf<'Emphasis'>;
export type StrongEmphasis = EntityOf<'StrongEmphasis'>;
export type { Operator };

export type Roll = Extract<ExprNode, { type: 'Roll' }>;
export type CocRoll = Extract<ExprNode, { type: 'CocRoll' }>;
export type FateRoll = Extract<ExprNode, { type: 'FateRoll' }>;
export type DicePool = Extract<ExprNode, { type: 'DicePool' }>;
export type Num = Extract<ExprNode, { type: 'Num' }>;
export type SubExpr = Extract<ExprNode, { type: 'SubExpr' }>;

export type RollResult = ApiRollResult;
export type CocRollResult = ApiCocRollResult;
export type FateResult = ApiFateResult;
export type DicePoolResult = ApiDicePoolResult;
export type RepeatResult = ApiRepeatResult;

export interface ExportExpr extends Span {
  type: 'Expr';
  node: EvaluatedExprNode;
  text: string;
  exprText: string;
}

export interface ExportLink extends Span {
  type: 'ExportLink';
  href: string;
  title?: string;
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
