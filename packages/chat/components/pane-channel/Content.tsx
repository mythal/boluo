import clsx from 'clsx';
import Prando from 'prando';
import { memo, ReactNode, useMemo, useRef } from 'react';
import { makeRng } from '../../interpreter/eval';
import type { ParseResult } from '../../interpreter/parse-result';
import { Delay } from '../Delay';
import { EntityCode } from '../entities/EntityCode';
import { EntityCodeBlock } from '../entities/EntityCodeBlock';
import { EntityEmphasis } from '../entities/EntityEmphasis';
import { EntityEmpty } from '../entities/EntityEmpty';
import { EntityExpr } from '../entities/EntityExpr';
import { EntityLink } from '../entities/EntityLink';
import { EntityStrong } from '../entities/EntityStrong';
import { EntityText } from '../entities/EntityText';
import { SelfCursorToolbar } from './SelfCursorToolbar';

interface Props {
  channelId: string;
  parsed: ParseResult;
  self?: boolean;
  isPreview: boolean;
  seed?: number[];
  cursorNode?: ReactNode;
  nameNode: ReactNode;
}

export const Content = memo<Props>(({
  channelId,
  parsed: { text: source, entities, isAction },
  nameNode,
  seed,
  isPreview,
  cursorNode = null,
  self = false,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const rng: Prando | undefined = useMemo(() => makeRng(seed), [seed]);
  const entityNodeList = useMemo(() => {
    if (entities.length === 0) {
      return <EntityEmpty cursorNode={cursorNode} />;
    }
    return entities.map((entity, index) => {
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
          return <EntityExpr key={index} source={source} node={entity.node} rng={rng} />;
      }
    });
  }, [cursorNode, entities, rng, source]);
  return (
    <div ref={ref} className={clsx('h-full break-all whitespace-pre-wrap relative pr-6', self ? 'pb-12' : '')}>
      {isAction && <span className="mr-1 text-surface-400">*</span>}
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
