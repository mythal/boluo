import Trash from '@boluo/icons/Trash';
import { useSetAtom } from 'jotai';
import { type FC, memo, useCallback } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { Delay } from '@boluo/ui/Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';

export const RemoveMediaButton = memo(() => {
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const removeMedia = useCallback(() => {
    dispatch({ type: 'media', payload: { media: null } });
  }, [dispatch]);
  return (
    <Button small onClick={removeMedia}>
      <Delay fallback={<FallbackIcon />}>
        <Icon icon={Trash} />
      </Delay>
    </Button>
  );
});

RemoveMediaButton.displayName = 'RemoveMediaButton';
