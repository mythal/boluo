import { Entity, EvaluatedExprNode, ExprNode, PureExprNode } from '@boluo/types/bindings';
import type { Get } from './get';
import type { Patch } from './patch';
import type { Post } from './post';
import type { AppResponse } from './request';

export type { AppResponse, Get, Patch, Post };
export { appFetch } from './common';
export { makeUri } from './request';
export { isApiError, errorCode } from './errors';
export type * from './errors';
export type * from './error-types';
export type * from './types';
export type * from '@boluo/types/bindings';

export type ExprOf<Tag extends ExprNode['type']> = Extract<ExprNode, { type: Tag }>;
export type PureExprOf<Tag extends PureExprNode['type']> = Extract<PureExprNode, { type: Tag }>;
export type EvaluatedExprOf<Tag extends ExprNode['type']> = Extract<
  EvaluatedExprNode,
  { type: Tag }
>;
export type MaybeEvalutedExprOf<Tag extends ExprNode['type']> = ExprOf<Tag> | EvaluatedExprOf<Tag>;
export type EntityOf<Tag extends Entity['type']> = Entity & { type: Tag };

export type EvaluatedExpr = {
  type: 'EvaluatedExpr';
  node: EvaluatedExprNode;
  start: number;
  len: number;
};
