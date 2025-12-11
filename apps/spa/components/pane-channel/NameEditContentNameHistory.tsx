import { ButtonInline } from '@boluo/ui/ButtonInline';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { type FC, useMemo, useState } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

const NameButton: FC<{ name: string; defaultCharacterName: string }> = ({
  name,
  defaultCharacterName,
}) => {
  const { composeAtom, characterNameAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const pressedAtom = useMemo(
    () =>
      atom((read) => {
        const characterName = read(characterNameAtom);
        return characterName === name;
      }),
    [characterNameAtom, name],
  );
  const pressed = useAtomValue(pressedAtom);
  return (
    <ButtonInline
      key={name}
      data-active={pressed}
      onClick={() => {
        dispatch({
          type: 'setCharacterName',
          payload: { name, setInGame: true },
        });
      }}
    >
      {name}
    </ButtonInline>
  );
};

interface Props {
  names: string[];
  defaultCharacterName: string;
}

export const NameEditContentNameHistory: FC<Props> = ({ names, defaultCharacterName }) => {
  const [showAllNames, setShowAllNames] = useState(false);
  if (names.length === 0) return null;

  const visibleNames = showAllNames ? names : names.slice(0, 5);

  return (
    <div className="flex flex-wrap gap-1">
      {visibleNames.map((name) => (
        <NameButton key={name} name={name} defaultCharacterName={defaultCharacterName} />
      ))}
      {!showAllNames && names.length > 5 && (
        <ButtonInline
          onClick={() => {
            setShowAllNames(true);
          }}
        >
          ...
        </ButtonInline>
      )}
    </div>
  );
};
