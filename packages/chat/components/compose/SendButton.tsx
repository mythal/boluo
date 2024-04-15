import type { User } from '@boluo/api';
import { Edit, PaperPlane } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { useComposeError } from '../../hooks/useComposeError';

interface Props {
  currentUser: User;
  editMode?: boolean;
  send: () => Promise<void>;
}

export const SendButton: FC<Props> = ({ currentUser, editMode = false, send }) => {
  const composeError = useComposeError();
  return (
    <Button onClick={() => send()} disabled={composeError !== null}>
      {editMode ? <FormattedMessage defaultMessage="Edit" /> : <FormattedMessage defaultMessage="Send" />}
      {editMode ? <Edit /> : <PaperPlane />}
    </Button>
  );
};
