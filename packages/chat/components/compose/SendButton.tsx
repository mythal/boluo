import type { User } from '@boluo/api';
import { Edit, PaperPlane } from '@boluo/icons';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useComposeError } from '../../hooks/useComposeError';
import { InComposeButton } from './InComposeButton';

interface Props {
  currentUser: User;
  isEditing?: boolean;
  send: () => Promise<void>;
}

export const SendButton: FC<Props> = ({ currentUser, isEditing = false, send }) => {
  const intl = useIntl();
  const composeError = useComposeError();
  const title = isEditing
    ? intl.formatMessage({ defaultMessage: 'Edit' })
    : intl.formatMessage({ defaultMessage: 'Send' });
  return (
    <InComposeButton onClick={() => send()} disabled={composeError !== null} title={title}>
      {isEditing ? <Edit /> : <PaperPlane />}
    </InComposeButton>
  );
};
