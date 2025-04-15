import clsx from 'clsx';
import { memo, type ReactNode, useMemo, type MouseEventHandler } from 'react';
import type { Entity, EvaluatedExprNode, Entities } from '@boluo/api';
import { evaluate, makeRng } from '../../interpreter/eval';
import { EntityCode } from '../entities/EntityCode';
import { EntityCodeBlock } from '../entities/EntityCodeBlock';
import { EntityEmphasis } from '../entities/EntityEmphasis';
import { EntityExpr } from '../entities/EntityExpr';
import { EntityLink } from '../entities/EntityLink';
import { EntityStrong } from '../entities/EntityStrong';
import { EntityText } from '../entities/EntityText';
import { EntityEvaluatedExpr } from '../entities/EntityEvaluatedExpr';
import { ZERO_WIDTH_SPACE } from '../../const';
import { EntityUnknown } from '../entities/EntityUnknown';

interface Props {
  source: string;
  entities: Entities;
  isAction: boolean;
  isArchived: boolean;
  seed?: number[];
  nameNode: ReactNode;
  onDoubleClick?: MouseEventHandler<HTMLSpanElement>;
  onContextMenu?: MouseEventHandler<HTMLSpanElement>;
}

export type EvaluatedExpr = {
  type: 'EvaluatedExpr';
  node: EvaluatedExprNode;
  start: number;
  len: number;
};

export const Content = memo<Props>(
  ({
    source,
    entities,
    isAction,
    isArchived,
    nameNode,
    seed,
    onContextMenu,
    onDoubleClick,
  }: Props) => {
    const evaluatedEntities: Array<Entity | EvaluatedExpr> = useMemo(() => {
      if (seed == null || seed.length !== 4) {
        return entities;
      }
      const rng = makeRng(seed);
      const extendedEntities: Array<Entity | EvaluatedExpr> = [];
      for (const entity of entities) {
        if (entity.type === 'Expr') {
          const evaluated = evaluate(entity.node, rng);
          extendedEntities.push({
            type: 'EvaluatedExpr',
            node: evaluated,
            start: entity.start,
            len: entity.len,
          });
        } else {
          extendedEntities.push(entity);
        }
      }
      return extendedEntities;
    }, [entities, seed]);
    const entityNodeList = useMemo(() => {
      if (evaluatedEntities.length === 0) {
        return <span>{ZERO_WIDTH_SPACE}</span>;
      }
      const nodeList = [];
      nodeList.push(
        ...evaluatedEntities.map((entity, index) => {
          switch (entity.type) {
            case 'Text':
              return <EntityText key={index} source={source} entity={entity} />;
            case 'Link':
              return <EntityLink key={index} source={source} entity={entity} />;
            case 'Strong':
              return <EntityStrong key={index} source={source} entity={entity} />;
            case 'Emphasis':
              return <EntityEmphasis key={index} source={source} entity={entity} />;
            case 'Code':
              return <EntityCode key={index} source={source} entity={entity} />;
            case 'CodeBlock':
              return <EntityCodeBlock key={index} source={source} entity={entity} />;
            case 'Expr':
              return <EntityExpr key={index} source={source} entity={entity} />;
            case 'EvaluatedExpr':
              return <EntityEvaluatedExpr key={index} source={source} entity={entity} />;
            default:
              return <EntityUnknown key={index} />;
          }
        }),
      );
      if (source[source.length - 1] === '\n') {
        // Add a space to prevent the last line from being collapsed
        nodeList.push(<span key="space">{ZERO_WIDTH_SPACE}</span>);
      }
      return nodeList;
    }, [source, evaluatedEntities]);
    return (
      <span
        className={clsx(
          'Content relative whitespace-pre-wrap break-words',
          isArchived ? 'decoration-highest/50 line-through' : '',
        )}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      >
        {isAction && <span className="text-message-action mr-1">*</span>}
        {isAction && nameNode}
        {entityNodeList}
      </span>
    );
  },
);
Content.displayName = 'Content';
