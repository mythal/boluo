import type { FC } from 'react';
import type { Strong } from '../../interpreter/entities';
import { EntityEmphasis } from './EntityEmphasis';

interface Props {
  source: string;
  entity: Strong;
}

export const EntityStrong: FC<Props> = ({ source, entity: { child } }) => {
  const content =
    child.type === 'Text' ? (
      source.substring(child.start, child.start + child.len)
    ) : (
      <EntityEmphasis source={source} entity={child} />
    );
  return <strong className="EntityStrong">{content}</strong>;
};
