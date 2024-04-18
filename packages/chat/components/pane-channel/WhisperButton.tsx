import { useQueryUser } from '@boluo/common';
import { Whisper } from '@boluo/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {}

export const WhisperButton: FC<Props> = ({}) => {
  const { data: currentUser } = useQueryUser();
  const { isWhisperAtom, composeAtom } = useChannelAtoms();
  const isWhisper = useAtomValue(isWhisperAtom);
  const dispatch = useSetAtom(composeAtom);
  const handleClick = () => {
    dispatch({ type: 'toggleWhisper', payload: currentUser != null ? { username: currentUser.username } : {} });
  };
  return (
    <Button data-small type="button" data-type="switch" data-on={isWhisper} onClick={handleClick}>
      <Icon icon={Whisper} />
      <span className="@md:inline hidden">
        <FormattedMessage defaultMessage="Whisper" />
      </span>
    </Button>
  );
};
