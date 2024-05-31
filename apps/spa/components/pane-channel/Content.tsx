import clsx from 'clsx';
import { memo, type ReactNode, useMemo } from 'react';
import type { Entity, EvaluatedExprNode } from '../../interpreter/entities';
import { evaluate, makeRng } from '../../interpreter/eval';
import { Delay } from '../Delay';
import { EntityCode } from '../entities/EntityCode';
import { EntityCodeBlock } from '../entities/EntityCodeBlock';
import { EntityEmphasis } from '../entities/EntityEmphasis';
import { EntityTail } from '../entities/EntityTail';
import { EntityExpr } from '../entities/EntityExpr';
import { EntityLink } from '../entities/EntityLink';
import { EntityStrong } from '../entities/EntityStrong';
import { EntityText } from '../entities/EntityText';
import { SelfCursorToolbar } from './SelfCursorToolbar';
import { useIsDragging } from '../../hooks/useIsDragging';
import { Cursor } from '../entities/Cursor';
import { type PrimitiveAtom } from 'jotai';
import { EntityEvaluatedExpr } from '../entities/EntityEvaluatedExpr';
import { EntityHead } from '../entities/EntityHead';
import { ZERO_WIDTH_SPACE } from '../../const';

interface Props {
  channelId: string;
  source: string;
  entities: Entity[];
  isAction: boolean;
  isArchived: boolean;
  self?: boolean;
  isPreview: boolean;
  seed?: number[];
  isFocused?: boolean;
  nameNode: ReactNode;
  cursorAtom?: PrimitiveAtom<HTMLElement | null>;
}

export type EvaluatedExpr = { type: 'EvaluatedExpr'; node: EvaluatedExprNode; start: number; len: number };

export const Content = memo<Props>(
  ({
    source,
    entities,
    isAction,
    isArchived,
    nameNode,
    seed,
    isPreview,
    self = false,
    isFocused = false,
    cursorAtom,
  }) => {
    const isDragging = useIsDragging();

    const cursorNode = useMemo(
      () => (!cursorAtom || isDragging || !isFocused ? null : <Cursor self atom={cursorAtom} />),
      [cursorAtom, isDragging, isFocused],
    );
    const evaluatedEntities: Array<Entity | EvaluatedExpr> = useMemo(() => {
      if (seed == null || seed.length !== 4) {
        return entities;
      }
      const rng = makeRng(seed);
      const extendedEntities: Array<Entity | EvaluatedExpr> = [];
      for (const entity of entities) {
        if (entity.type === 'Expr') {
          const evaluated = evaluate(entity.node, rng);
          extendedEntities.push({ type: 'EvaluatedExpr', node: evaluated, start: entity.start, len: entity.len });
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
      const nodeList = [
        <EntityHead cursorNode={cursorNode} key="head" firstEntityStart={evaluatedEntities[0]?.start ?? 0} />,
      ];
      nodeList.push(
        ...evaluatedEntities.map((entity, index) => {
          switch (entity.type) {
            case 'Text':
              return <EntityText cursorNode={cursorNode} key={index} source={source} entity={entity} />;
            case 'Link':
              return <EntityLink cursorNode={cursorNode} key={index} source={source} entity={entity} />;
            case 'Strong':
              return <EntityStrong cursorNode={cursorNode} key={index} source={source} entity={entity} />;
            case 'Emphasis':
              return <EntityEmphasis cursorNode={cursorNode} key={index} source={source} entity={entity} />;
            case 'Code':
              return <EntityCode key={index} source={source} entity={entity} />;
            case 'CodeBlock':
              return <EntityCodeBlock key={index} source={source} entity={entity} />;
            case 'Expr':
              return <EntityExpr key={index} source={source} entity={entity} />;
            case 'EvaluatedExpr':
              return <EntityEvaluatedExpr key={index} source={source} entity={entity} />;
          }
        }),
      );
      nodeList.push(<EntityTail key="tail" source={source} cursorNode={cursorNode} />);
      if (source[source.length - 1] === '\n') {
        // Add a space to prevent the last line from being collapsed
        nodeList.push(<span key="space"> </span>);
      }
      return nodeList;
    }, [source, cursorNode, evaluatedEntities]);
    return (
      <>
        <div
          className={clsx(
            'relative h-full whitespace-pre-wrap break-all',
            self ? 'pb-1' : '',
            isArchived ? 'decoration-highest/50 line-through' : '',
          )}
        >
          {isAction && <span className="text-message-action mr-1">*</span>}
          {isAction && nameNode}
          {entityNodeList}
        </div>

        {isPreview && isFocused && self && !isDragging && cursorAtom && (
          <Delay timeout={300}>
            <SelfCursorToolbar cursorAtom={cursorAtom} />
          </Delay>
        )}
      </>
    );
  },
);
Content.displayName = 'Content';
