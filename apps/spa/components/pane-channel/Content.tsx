import clsx from 'clsx';
import { memo, type ReactNode, useMemo, type MouseEventHandler } from 'react';
import type { Entity, EvaluatedExprNode, Entities, EvaluatedExpr } from '@boluo/api';
import { evaluate, makeRng } from '@boluo/interpreter';
import { EntityExpr } from '@boluo/ui/entities/EntityExpr';
import { EntityEvaluatedExpr } from '@boluo/ui/entities/EntityEvaluatedExpr';
import { ZERO_WIDTH_SPACE } from '../../const';
import { EntityCode } from '@boluo/ui/entities/EntityCode';
import { EntityCodeBlock } from '@boluo/ui/entities/EntityCodeBlock';
import { EntityEmphasis } from '@boluo/ui/entities/EntityEmphasis';
import { EntityLink } from '@boluo/ui/entities/EntityLink';
import { EntityStrong } from '@boluo/ui/entities/EntityStrong';
import { EntityText } from '@boluo/ui/entities/EntityText';
import { EntityStrongEmphasis } from '@boluo/ui/entities/EntityStrongEmphasis';
import { EntityUnknown } from '@boluo/ui/entities/EntityUnknown';

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
            case 'StrongEmphasis':
              return (
                <EntityStrongEmphasis
                  key={index}
                  source={source}
                  entity={entity}
                  isAction={isAction}
                />
              );
            case 'Strong':
              return <EntityStrong key={index} source={source} entity={entity} />;
            case 'Emphasis':
              return (
                <EntityEmphasis key={index} source={source} entity={entity} isAction={isAction} />
              );
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
    }, [evaluatedEntities, source, isAction]);
    return (
      <span
        className={clsx(
          'Content relative wrap-break-word whitespace-pre-wrap',
          isArchived ? 'decoration-text-secondary decoration-opacity-50 line-through' : '',
          isAction ? 'italic' : '',
        )}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      >
        {isAction && <span className="text-text-muted mr-1">*</span>}
        {isAction && nameNode}
        {entityNodeList}
      </span>
    );
  },
);
Content.displayName = 'Content';
