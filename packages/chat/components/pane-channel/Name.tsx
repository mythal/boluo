import { Gamemaster } from '@boluo/icons';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { NameBox } from './NameBox';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  color: string;
  isMaster: boolean;
  className?: string;
  self: boolean;
  isPreview?: boolean;
}

export const Name: FC<Props> = ({ name, className, isMaster, inGame, color, isPreview = false, self }) => {
  const isEmptyName = name === '' || name == null;
  const masterIcon = <Gamemaster className="inline-block h-[1em] w-[1em]" />;
  return (
    <NameBox color={inGame ? color : undefined} icon={isMaster ? masterIcon : undefined}>
      {isEmptyName ? (
        <span className="text-error-400 italic">
          <FormattedMessage defaultMessage="No Name" />
        </span>
      ) : (
        name
      )}
    </NameBox>
  );
};
