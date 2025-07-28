import type { ExprNode } from './entities';

interface LegacyBaseEntity {
  start: number;
  offset: number;
}

interface Text extends LegacyBaseEntity {
  type: 'Text';
}

interface Link extends LegacyBaseEntity {
  type: 'Link';
  href: string;
  title?: string;
}

interface Expr extends LegacyBaseEntity {
  type: 'Expr';
  node: ExprNode;
}

interface Code extends LegacyBaseEntity {
  type: 'Code';
}

interface CodeBlock extends LegacyBaseEntity {
  type: 'CodeBlock';
}

interface Strong extends LegacyBaseEntity {
  type: 'Strong';
}

interface Emphasis extends LegacyBaseEntity {
  type: 'Emphasis';
}

export type LegacyEntity = Text | Link | Expr | Strong | Emphasis | Code | CodeBlock;

export function isLegacyEntity(raw: unknown): raw is LegacyEntity {
  if (typeof raw !== 'object' || raw == null || !('type' in raw)) {
    return false;
  }
  return 'offset' in raw && 'start' in raw;
}
