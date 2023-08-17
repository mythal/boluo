import { Whisper } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';

interface Props {
}

export const WhisperButton: FC<Props> = ({}) => {
  return (
    <Button data-small type="button" data-type="switch">
      <Icon icon={Whisper} />
      <span className="hidden @md:inline">
        <FormattedMessage defaultMessage="Whisper" />
      </span>
    </Button>
  );
};
