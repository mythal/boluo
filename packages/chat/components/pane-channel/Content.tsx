import clsx from 'clsx';
import Prando from 'prando';
import { memo, ReactNode, RefObject, useEffect, useMemo, useRef } from 'react';
import type { Entity } from '../../interpreter/entities';
import { makeRng } from '../../interpreter/eval';
import { Delay } from '../Delay';
import { EntityCode } from '../entities/EntityCode';
import { EntityCodeBlock } from '../entities/EntityCodeBlock';
import { EntityEmphasis } from '../entities/EntityEmphasis';
import { EntityEmpty } from '../entities/EntityEmpty';
import { EntityExpr } from '../entities/EntityExpr';
import { EntityLink } from '../entities/EntityLink';
import { EntityStrong } from '../entities/EntityStrong';
import { EntityText } from '../entities/EntityText';
import { CursorToolbarHandle, SelfCursorToolbar } from './SelfCursorToolbar';

interface Props {
  channelId: string;
  source: string;
  entities: Entity[];
  isAction: boolean;
  isArchived: boolean;
  self?: boolean;
  isPreview: boolean;
  seed?: number[];
  cursorRef?: RefObject<HTMLElement | null>;
  cursorNode?: ReactNode;
  nameNode: ReactNode;
}

export const Content = memo<Props>(
  ({
    channelId,
    source,
    entities,
    isAction,
    isArchived,
    nameNode,
    seed,
    isPreview,
    cursorRef,
    cursorNode = null,
    self = false,
  }) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const toolbarHandle = useRef<CursorToolbarHandle | null>(null);
    useEffect(() => {
      if (!isPreview || !self) return;
      const handle = window.setTimeout(() => {
        toolbarHandle.current?.update();
      }, 8);
      return () => window.clearTimeout(handle);
    });
    const cursorToolbar = useMemo(() => {
      if (!isPreview || !self || !cursorRef) return null;
      return (
        <Delay timeout={300}>
          <SelfCursorToolbar cursorRef={cursorRef} ref={toolbarHandle} contentRef={ref} />
        </Delay>
      );
    }, [cursorRef, isPreview, self]);
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
      <>
        <div
          ref={ref}
          className={clsx(
            'relative h-full whitespace-pre-wrap break-all pr-6',
            self ? 'pb-12' : '',
            isPreview ? 'animate-pulse' : '',
            isArchived ? 'line-through' : '',
          )}
        >
          {isAction && <span className="text-surface-400 mr-1">*</span>}
          {isAction && nameNode}
          {entityNodeList}
        </div>

        {cursorToolbar}
      </>
    );
  },
);
Content.displayName = 'Content';
