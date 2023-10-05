import { ChannelMember } from 'api';
import clsx from 'clsx';
import { Save } from 'icons';
import { FC, memo } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { useEditChannelCharacterName } from '../../hooks/useEditChannelCharacterName';
import { Delay } from '../Delay';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { NameToolbox } from './NameToolbox';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}

const SaveAsCharacterName: FC<{ channelId: string; characterName: string }> = ({ channelId, characterName }) => {
  const {
    trigger,
    isMutating,
  } = useEditChannelCharacterName(channelId);
  return (
    <button
      className={clsx(
        'absolute left-0 bottom-full w-max bg-pin-brand-600 text-pin-lowest rounded-sm shadow-1/2 shadow-surface-400/50 px-2 py-1 -translate-x-2',
        'opacity-40 hover:opacity-100 group-hover:opacity-100',
      )}
      onClick={() => trigger({ characterName })}
    >
      {isMutating
        ? (
          <span className="text-sm animate-pulse text-pin-lowest">
            <FormattedMessage defaultMessage="Saving…" />
          </span>
        )
        : (
          <span className="text-sm flex-none">
            <Icon icon={Save} className="mr-1" />
            <FormattedMessage defaultMessage="Keep name" />
          </span>
        )}
    </button>
  );
};

export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const { isMaster, characterName } = channelMember;
  return (
    <div className="flex @2xl:flex-col pb-2 gap-y-1 gap-x-4 items-center @2xl:items-end justify-between @2xl:justify-start">
      <div className="flex-grow flex-shrink-1 @2xl:flex-shrink-0 max-w-full relative">
        {!isAction ? <Name name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}
        <NameToolbox channelMember={channelMember} />

        {inGame && name !== '' && characterName !== name && (
          <Delay fallback={null}>
            <SaveAsCharacterName channelId={channelMember.channelId} characterName={name} />
          </Delay>
        )}
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
