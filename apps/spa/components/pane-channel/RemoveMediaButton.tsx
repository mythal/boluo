import { Trash } from '@boluo/icons';
import { useSetAtom } from 'jotai';
import { type FC, useCallback } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { Delay } from '@boluo/ui/Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';

export const RemoveMediaButton: FC = () => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const removeMedia = useCallback(() => {
    dispatch({ type: 'media', payload: { media: null } });
  }, [dispatch]);
  return (
    <button
      onClick={removeMedia}
      className="bg-surface-muted hover:border-border-strong hover:bg-surface-default border-border-subtle rounded border p-2"
    >
      <Delay fallback={<FallbackIcon />}>
        <Trash />
      </Delay>
    </button>
  );
};
