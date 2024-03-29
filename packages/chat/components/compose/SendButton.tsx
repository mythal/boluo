import type { GetMe } from '@boluo/api';
import { Edit, PaperPlane } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useComposeError } from '../../hooks/useComposeError';
import { useSend } from '../pane-channel/useSend';

interface Props {
  me: GetMe;
  editMode?: boolean;
}

export const SendButton: FC<Props> = ({ me, editMode = false }) => {
  const composeError = useComposeError();
  const send = useSend(me.user, composeError);
  return (
    <Button onClick={() => send()} disabled={composeError !== null}>
      {editMode ? <FormattedMessage defaultMessage="Edit" /> : <FormattedMessage defaultMessage="Send" />}
      {editMode ? <Edit /> : <PaperPlane />}
    </Button>
  );
};
