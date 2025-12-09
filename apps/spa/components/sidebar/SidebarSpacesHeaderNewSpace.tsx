import Plus from '@boluo/icons/Plus';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import Icon from '@boluo/ui/Icon';
import { useAtomValue } from 'jotai';
import { FC, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';

export const SidebarSpacesHeaderNewSpace: FC = () => {
  const panes = useAtomValue(panesAtom);
  const togglePane = usePaneToggle();
  const intl = useIntl();
  const newSpaceLabel = intl.formatMessage({ defaultMessage: 'New Space' });
  const isCreateSpacePaneOpened = useMemo(
    () => panes.find((pane) => pane.type === 'CREATE_SPACE') !== undefined,
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
