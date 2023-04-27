import clsx from 'clsx';
import Prando from 'prando';
import { memo, ReactNode, useMemo, useRef } from 'react';
import type { Entity } from '../../interpreter/entities';
import { makeRng } from '../../interpreter/eval';
import type { ParseResult } from '../../interpreter/parser';
import { Delay } from '../Delay';
import { EntityCode } from '../entities/EntityCode';
import { EntityCodeBlock } from '../entities/EntityCodeBlock';
import { EntityEmphasis } from '../entities/EntityEmphasis';
import { EntityExpr } from '../entities/EntityExpr';
import { EntityLink } from '../entities/EntityLink';
import { EntityStrong } from '../entities/EntityStrong';
import { EntityText } from '../entities/EntityText';
import { EntityUnknown } from '../entities/EntityUnknown';
import { SelfCursorToolbar } from './SelfCursorToolbar';

interface Props {
  parsed: ParseResult;
  self?: boolean;
  isAction: boolean;
  isPreview: boolean;
  seed?: number[];
  nameNode: ReactNode;
}

export const Content = memo<Props>(({
  parsed: { text: source, entities },
  isAction,
  nameNode,
  seed,
  isPreview,
  self = false,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const rng: Prando | undefined = useMemo(() => makeRng(seed), [seed]);
  const entityNodeList = useMemo(() => {
    const defaultEntities: Entity[] = [{ type: 'Text', start: 0, len: source.length }];
    return (entities.length === 0 ? defaultEntities : entities).map((entity, index) => {
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
          return <EntityExpr key={index} source={source} node={entity.node} rng={rng} />;
      }
    });
  }, [entities, rng, source]);
  return (
    <div ref={ref} className={clsx('h-full break-all whitespace-pre-wrap relative', self ? 'pb-12' : '')}>
      {isAction && nameNode}
      {entityNodeList}
      {self && isPreview && (
        <Delay timeout={300}>
          <SelfCursorToolbar contentRef={ref} />
        </Delay>
      )}
    </div>
  );
});
Content.displayName = 'Content';