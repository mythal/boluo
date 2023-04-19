import { ExternalLink } from 'icons';
import type { FC } from 'react';
import type { Link } from '../../interpreter/entities';
import { EntityText } from './EntityText';

interface Props {
  source: string;
  entity: Link;
}

export const EntityLink: FC<Props> = ({ source, entity }) => {
  const { title } = entity;
  let href = '';
  if (typeof entity.href === 'string') {
    href = entity.href;
  } else {
    const start = entity.href.start;
    href = source.substring(start, start + entity.href.len);
  }
  const childStart = entity.child.start;
  const childEnd = childStart + entity.child.len;
  return (
    <a target="_blank" title={title} href={href} className="underline underline-offset-2">
      <EntityText source={source.substring(childStart, childEnd)} entity={entity.child} />
      <ExternalLink className="inline" />
    </a>
  );
};
