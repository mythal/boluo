import { type FC } from 'react';
import { composeBackupKey } from '../../hooks/useBackupCompose';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { FormattedMessage } from 'react-intl';
import { type ChannelAtoms } from '../../hooks/useChannelAtoms';
import { useSetAtom } from 'jotai';

interface Props {
  channelId: string;
  inGame: boolean;
  composeAtom: ChannelAtoms['composeAtom'];
}

export const SelfPreviewPlaceholder: FC<Props> = ({ channelId, inGame, composeAtom }) => {
  const backedUp = sessionStorage.getItem(composeBackupKey(channelId));
  const dispatch = useSetAtom(composeAtom);
  const restore = () => {
    if (!backedUp) return;
    dispatch({ type: 'setSource', payload: { channelId, source: backedUp } });
  };
  return (
    <span>
      <span className="mr-2 italic">
        {inGame ? (
          <span>
            <FormattedMessage defaultMessage="Tell your adventures" />
          </span>
        ) : (
          <span>
            <FormattedMessage defaultMessage="Type a message" />
          </span>
        )}
      </span>
      {backedUp && (
        <ButtonInline onClick={restore}>
          <FormattedMessage defaultMessage="Restore Draft" />
        </ButtonInline>
      )}
    </span>
  );
};
