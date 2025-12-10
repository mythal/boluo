import Plus from '@boluo/icons/Plus';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import { useAtomValue } from 'jotai';
import { type FC, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';
import { findPane } from '../../state/view.utils';

export const SidebarSpacesHeaderNewSpace: FC = () => {
  const panes = useAtomValue(panesAtom);
  const togglePane = usePaneToggle();
  const intl = useIntl();
  const newSpaceLabel = intl.formatMessage({ defaultMessage: 'New Space' });
  const isCreateSpacePaneOpened = useMemo(
    () => findPane(panes, (pane) => pane.type === 'CREATE_SPACE') !== null,
    [panes],
  );

  const handleToggleCreateSpacePane = () => {
    togglePane({ type: 'CREATE_SPACE' });
  };

  return (
    <ButtonInline
      aria-label={newSpaceLabel}
      title={newSpaceLabel}
      onClick={handleToggleCreateSpacePane}
      aria-pressed={isCreateSpacePaneOpened}
    >
      <Icon icon={Plus} />
    </ButtonInline>
  );
};
