import { type User } from '@boluo/api';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { ChevronUp, Plus } from '@boluo/icons';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import clsx from 'clsx';
import { useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  spaceId: string;
  currentUser: User;
}

export const SidebarCharacters: FC<Props> = ({ spaceId, currentUser }) => {
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };
  if (!mySpaceMember) {
    return null;
  }
  return (
    <div>
      <div className="group text-text-secondary flex gap-1 px-4 text-sm">
        <button className="grow cursor-pointer text-left select-none" onClick={toggleExpanded}>
          <FormattedMessage defaultMessage="Characters" />
        </button>
        <ButtonInline groupHover onClick={toggleExpanded} aria-pressed={expanded}>
          <Icon
            icon={ChevronUp}
            className={clsx({ 'rotate-180': expanded }, 'transition-transform duration-100')}
          />
        </ButtonInline>
        <ButtonInline>
          <Icon icon={Plus} />
        </ButtonInline>
      </div>
    </div>
  );
};
