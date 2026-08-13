import { useQueryCharacter } from '@boluo/hooks/useQueryCharacter';
import { useQueryUser } from '@boluo/hooks/useQueryUser';
import Users from '@boluo/icons/Users';
import HatGlasses from '@boluo/icons/HatGlasses';
import { Button } from '@boluo/ui/Button';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import Icon from '@boluo/ui/Icon';
import { UserCardContent } from '@boluo/ui/users/UserCard';
import { UserCardError } from '@boluo/ui/users/UserCardError';
import { UserCardLoading } from '@boluo/ui/users/UserCardLoading';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useState, type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useToggleCharacterPane } from '../../hooks/useToggleCharacterPane';
import {
  CharacterPortrait,
  type CharacterPortraitSource,
} from '../pane-character/CharacterPortrait';

interface Props {
  characterId: string;
  spaceId: string;
  userId: string;
  portraitId?: string | null;
  playerDetailsPosition: 'before' | 'after';
}

const CharacterCardLoading: FC = () => (
  <FloatingBox className="p-3">
    <FormattedMessage defaultMessage="Loading character information..." />
  </FloatingBox>
);

const CharacterCardError: FC = () => (
  <FloatingBox className="p-3">
    <FormattedMessage defaultMessage="Failed to load character information." />
  </FloatingBox>
);

export const NameCharacterPanel: FC<Props> = ({
  characterId,
  spaceId,
  userId,
  portraitId,
  playerDetailsPosition,
}) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const intl = useIntl();
  const { isCharacterPaneOpen, toggleCharacterDetails } = useToggleCharacterPane(spaceId);
  const {
    data: character,
    isLoading: isCharacterLoading,
    error: characterError,
  } = useQueryCharacter(spaceId, characterId);
  const { data: user, isLoading: isUserLoading, error: userError } = useQueryUser(userId);
  const { data: appSettings } = useQueryAppSettings();

  if (isCharacterLoading) return <CharacterCardLoading />;
  if (characterError || character == null) return <CharacterCardError />;
  if (isUserLoading) return <UserCardLoading />;
  if (userError || user == null) return <UserCardError />;

  const portraitSource: CharacterPortraitSource | null =
    portraitId == null ? null : { type: 'ASSET', assetId: portraitId };
  const playerDetails = showPlayer ? (
    <div
      className={
        playerDetailsPosition === 'before'
          ? 'border-border-subtle mb-3 border-b pb-3'
          : 'border-border-subtle mt-3 border-t pt-3'
      }
    >
      <UserCardContent user={user} mediaUrl={appSettings?.mediaUrl} />
    </div>
  ) : null;

  return (
    <FloatingBox className="w-72 p-3">
      {playerDetailsPosition === 'before' && playerDetails}
      <div className="flex gap-3">
        {portraitSource != null && (
          <CharacterPortrait
            spaceId={spaceId}
            characterName={character.name}
            source={portraitSource}
            size="card"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pt-1 font-bold">{character.name}</div>
            <Button
              small
              on={isCharacterPaneOpen(character.id)}
              active={isCharacterPaneOpen(character.id)}
              aria-label={intl.formatMessage({ defaultMessage: 'Toggle character details' })}
              onClick={() => toggleCharacterDetails(character.id)}
              className="shrink-0 px-2"
            >
              <HatGlasses />
            </Button>
          </div>
          {character.description !== '' ? (
            <div className="text-text-secondary max-h-32 overflow-y-auto text-sm whitespace-pre-line">
              {character.description}
            </div>
          ) : (
            <div className="text-text-muted text-sm">
              <FormattedMessage defaultMessage="No description yet." />
            </div>
          )}
          <div className="text-text-muted mt-auto flex items-center gap-1 text-sm">
            <FormattedMessage defaultMessage="Played by" />
            <ButtonInline
              aria-expanded={showPlayer}
              aria-pressed={showPlayer}
              onClick={() => setShowPlayer((show) => !show)}
            >
              <Icon icon={Users} />
              <span className="ml-1">{user.nickname}</span>
            </ButtonInline>
          </div>
        </div>
      </div>
      {playerDetailsPosition === 'after' && playerDetails}
    </FloatingBox>
  );
};
