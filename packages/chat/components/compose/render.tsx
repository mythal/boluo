import { ReactNode } from 'react';
import { ParseResult } from '../../interpreter/parse-result';

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
        <span key={key} className="text-compose-highlight-modifiers-text">
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
      if (entity.type === 'Strong' || entity.type === 'Emphasis') {
        nodes.push(
          <span key={key} className="bg-compose-highlight-strong-bg rounded-sm">
            {segment}
          </span>,
        );
      } else if (entity.type === 'Link') {
        nodes.push(
          <span key={key} className="decoration-compose-highlight-link-underline underline">
            {segment}
          </span>,
        );
      } else if (entity.type === 'Code' || entity.type === 'CodeBlock') {
        nodes.push(
          <span key={key} className="bg-compose-highlight-code-bg rounded-sm">
            {segment}
          </span>,
        );
      } else if (entity.type === 'Expr') {
        nodes.push(
          <span key={key} className="bg-compose-highlight-expr-bg rounded-sm">
            {segment}
          </span>,
        );
      } else {
        nodes.push(<span key={key}>{segment}</span>);
      }
      prevEnd = end;
      key += 1;
    }
    return nodes;
  };
