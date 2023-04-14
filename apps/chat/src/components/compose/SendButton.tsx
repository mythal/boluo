import type { GetMe } from 'api';
import { PaperPlane } from 'icons';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, forwardRef, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSend } from '../channel/useSend';

interface Props {
  me: GetMe;
}

export const SendButton: FC<Props> = ({ me }) => {
  const composeAtom = useComposeAtom();
  const error = useAtomValue(useMemo(() => selectAtom(composeAtom, compose => compose.error), [composeAtom]));
  const send = useSend(me.user);
  return (
    <Button onClick={() => send()} disabled={error !== null}>
      <FormattedMessage defaultMessage="Send" />
      <PaperPlane />
    </Button>
  );
};
