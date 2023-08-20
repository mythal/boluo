import { useMe } from 'common';
import { Whisper } from 'icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
}

export const WhisperButton: FC<Props> = ({}) => {
  const me = useMe();
  const { isWhisperAtom, composeAtom } = useChannelAtoms();
  const isWhisper = useAtomValue(isWhisperAtom);
  const dispatch = useSetAtom(composeAtom);
  const handleClick = () => {
    dispatch({ type: 'toggleWhisper', payload: me != null && me !== 'LOADING' ? { username: me.user.username } : {} });
  };
  return (
    <Button data-small type="button" data-type="switch" data-on={isWhisper} onClick={handleClick}>
      <Icon icon={Whisper} />
      <span className="hidden @md:inline">
        <FormattedMessage defaultMessage="Whisper" />
      </span>
    </Button>
  );
};
