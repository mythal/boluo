import { type User } from '@boluo/api';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { ChevronUp, Plus } from '@boluo/icons';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { useMemo, useState, type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';
import { findPane } from '../../state/view.utils';

interface Props {
  spaceId: string;
  currentUser: User;
}

export const SidebarCharacters: FC<Props> = ({ spaceId, currentUser }) => {
  const panes = useAtomValue(panesAtom);
  const togglePane = usePaneToggle();
  const intl = useIntl();
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const [expanded, setExpanded] = useState(false);
  const isCreateCharacterPaneOpened = useMemo(
    () => findPane(panes, (pane) => pane.type === 'CREATE_CHARACTER') !== null,
    [panes],
  );
  const createCharacterLabel = intl.formatMessage({ defaultMessage: 'New Character' });
  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };
  const handleToggleCreateCharacterPane = () => {
    togglePane({ type: 'CREATE_CHARACTER', spaceId });
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
        <ButtonInline
          onClick={handleToggleCreateCharacterPane}
          aria-label={createCharacterLabel}
          title={createCharacterLabel}
          aria-pressed={isCreateCharacterPaneOpened}
        >
          <Icon icon={Plus} />
        </ButtonInline>
      </div>
    </div>
  );
};
