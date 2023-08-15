import type { ChannelMember, GetMe } from 'api';
import { Edit, PaperPlane } from 'icons';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useComposeError } from '../../hooks/useComposeError';
import { useSend } from '../pane-channel/useSend';

interface Props {
  me: GetMe;
  member: ChannelMember;
  editMode?: boolean;
}

export const SendButton: FC<Props> = ({ me, member, editMode = false }) => {
  const composeError = useComposeError(member);
  const send = useSend(me.user, member, composeError);
  return (
    <Button onClick={() => send()} disabled={composeError !== null}>
      {editMode ? <FormattedMessage defaultMessage="Edit" /> : <FormattedMessage defaultMessage="Send" />}
      {editMode ? <Edit /> : <PaperPlane />}
    </Button>
  );
};
