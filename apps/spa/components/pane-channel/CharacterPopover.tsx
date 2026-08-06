import type { MemberWithUser } from '@boluo/api';
import { useQueryCharacters } from '@boluo/hooks/useQueryCharacters';
import ChevronLeft from '@boluo/icons/ChevronLeft';
import { Button } from '@boluo/ui/Button';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { CharacterPicker } from './CharacterPicker';

interface Props {
  member: MemberWithUser;
  onBack: () => void;
}

export const CharacterPopover: FC<Props> = ({ member, onBack }) => {
  const {
    data: characters,
    error,
    isLoading,
  } = useQueryCharacters({
    spaceId: member.space.spaceId,
    includeArchived: true,
    portrayableOnly: true,
  });

  return (
    <div className="w-52 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">
          <FormattedMessage defaultMessage="All characters" />
        </div>
        <Button small onClick={onBack}>
          <ChevronLeft />
          <FormattedMessage defaultMessage="Back" />
        </Button>
      </div>
      <div className="max-h-80 overflow-y-auto pr-1">
        <CharacterPicker
          member={member}
          characters={characters}
          error={error}
          isLoading={isLoading}
          variant="all"
        />
      </div>
    </div>
  );
};
