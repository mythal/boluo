import { ExternalLink } from '@boluo/icons';
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
  return (
    <a
      target="_blank"
      title={title}
      href={href}
      className="EntityLink underline underline-offset-2"
      rel="noreferrer"
    >
      <EntityText source={source} entity={entity.child} />
      <ExternalLink className="inline" />
    </a>
  );
};
