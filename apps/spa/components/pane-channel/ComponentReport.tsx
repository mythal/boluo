import { useQueryCharacters } from '@boluo/hooks/useQueryCharacters';
import {
  EntityComponentReport,
  type EntityComponentReportProps,
} from '@boluo/ui/entities/EntityComponentReport';
import { useMemo } from 'react';
import { useChannel } from '../../hooks/useChannel';

export const ComponentReport = (props: Omit<EntityComponentReportProps, 'scopeNames'>) => {
  const spaceId = useChannel()?.spaceId;
  const { data: characters } = useQueryCharacters({ spaceId, includeArchived: true });
  const scopeNames = useMemo(
    () =>
      Object.fromEntries(
        (characters ?? []).map((character) => [character.scopeId, character.name]),
      ),
    [characters],
  );
  return <EntityComponentReport {...props} scopeNames={scopeNames} />;
};
