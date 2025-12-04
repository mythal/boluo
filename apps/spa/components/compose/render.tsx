import { type ReactNode } from 'react';
import { type ParseResult } from '@boluo/interpreter';

// Note: The `parsed` is possibly stale due to the delay in the `useDeferredValue` hook.
export const composeRender =
  (parsed: ParseResult) =>
  (text: string): ReactNode[] => {
    let key = 0;
    const nodes: ReactNode[] = [];
    let prevEnd = 0;
    for (const modifier of parsed.modifiers) {
      if (modifier.start > prevEnd) {
        nodes.push(<span key={key}>{text.slice(prevEnd, modifier.start)}</span>);
        key += 1;
      }
      const end = modifier.start + modifier.len;
      nodes.push(
        <span key={key} className="text-text-muted">
          {text.slice(modifier.start, end)}
        </span>,
      );
      prevEnd = end;
      key += 1;
    }
    for (const entity of parsed.entities) {
      if (entity.start > prevEnd) {
        nodes.push(<span key={key}>{text.slice(prevEnd, entity.start)}</span>);
        key += 1;
      }
      const end = entity.start + entity.len;
      const segment = text.slice(entity.start, end);
      if (
        entity.type === 'Strong' ||
        entity.type === 'Emphasis' ||
        entity.type === 'StrongEmphasis'
      ) {
        nodes.push(
          <span key={key} className="bg-surface-muted rounded-sm">
            {segment}
          </span>,
        );
      } else if (entity.type === 'Link') {
        nodes.push(
          <span key={key} className="decoration-text-link-decoration underline">
            {segment}
          </span>,
        );
      } else if (entity.type === 'Code' || entity.type === 'CodeBlock') {
        nodes.push(
          <span key={key} className="bg-surface-muted rounded-sm">
            {segment}
          </span>,
        );
      } else if (entity.type === 'Expr') {
        nodes.push(
          <span key={key} className="bg-state-info-bg rounded-sm">
            {segment}
          </span>,
        );
      } else {
        nodes.push(<span key={key}>{segment}</span>);
      }
      prevEnd = end;
      key += 1;
    }
    if (prevEnd < text.length) {
      nodes.push(<span key={key}>{text.slice(prevEnd)}</span>);
    }
    return nodes;
  };
