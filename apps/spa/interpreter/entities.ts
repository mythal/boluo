import type { Entity, EntityOf, EvaluatedExprNode, Span } from '@boluo/api';

export interface ExportExpr extends Span {
  type: 'Expr';
  node: EvaluatedExprNode;
  text: string;
  exprText: string;
}

export interface ExportLink extends Span {
  type: 'Link';
  href: string;
  title?: string;
  text: string;
}

export type ExportEntity = (
  | EntityOf<'Text'>
  | ExportLink
  | EntityOf<'Strong'>
  | EntityOf<'Emphasis'>
  | EntityOf<'Code'>
  | EntityOf<'CodeBlock'>
  | ExportExpr
) & { text: string };

export const toSimpleText = (source: string, entities: Entity[]): string => {
  let text = '';
  for (const entity of entities) {
    switch (entity.type) {
      case 'Text':
        text += source.slice(entity.start, entity.start + entity.len);
        break;
      case 'Code':
      case 'Strong':
      case 'Emphasis':
        text += source.slice(entity.child.start, entity.child.start + entity.child.len);
        break;
      case 'Link':
        text += '🔗';
        break;
      case 'Expr':
        text += '🎲';
        break;
      default:
        text += '…';
    }
  }
  return text;
};
