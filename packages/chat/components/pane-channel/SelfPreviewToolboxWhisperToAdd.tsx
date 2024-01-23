import { Member } from 'api';
import { FC } from 'react';

interface Props {
  members: Member[];
  add: (username: string) => void;
}

export const WhisperToItemAdd: FC<Props> = ({ members, add }) => {
  const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    e.preventDefault();
    if (e.target.value === '') return;
    add(e.target.value);
  };
  return (
    <select
      value=""
      onChange={handleChange}
      className="bg-lowest hover:border-surface-400 w-6 appearance-none rounded border text-center"
    >
      <option value="">+</option>
      {members.map((member) => {
        let name = member.user.nickname;
        if (member.channel.characterName !== '') {
          name += ` (${member.channel.characterName})`;
        }

        return (
          <option key={member.user.id} value={member.user.username}>
            {name}
          </option>
        );
      })}
    </select>
  );
};
