import type { Space } from 'boluo-api';
import { ChevronDown, ChevronUp, Settings } from 'boluo-icons';
import clsx from 'clsx';
import type { FC } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChatPaneDispatch } from '../../../state/panes';
import type { Pane, SpaceSettingsPane } from '../../../types/ChatPane';
import { SidebarItem } from './SidebarItem';

interface Props {
  space: Space;
  panes: Pane[];
}

export const SpaceOptions: FC<Props> = ({ space, panes }) => {
  const dispatch = useChatPaneDispatch();
  const [folded, setFold] = useState(true);
  const spaceSettingsPane: SpaceSettingsPane = { type: 'SPACE_SETTINGS', id: space.id, spaceId: space.id };
  const spaceSettingsActive = useMemo(() => panes.findIndex(pane => pane.type === 'SPACE_SETTINGS') !== -1, [panes]);
  return (
    <div className={folded ? '' : 'border-b'}>
      <button
        onClick={() => setFold(fold => !fold)}
        className="flex items-center justify-between w-full text-surface-600 py-3 px-4 text-sm border-b border-surface-200 group cursor-pointer hover:bg-surface-100"
      >
        <span className="overflow-ellipsis overflow-hidden break-all whitespace-nowrap">{space.name}</span>
        <span
          className={clsx(
            'p-1 border rounded-md bg-surface-50',
            folded ? 'group-hover:border-surface-300' : 'border-surface-400',
          )}
        >
          {folded ? <ChevronDown /> : <ChevronUp />}
        </span>
      </button>
      {!folded && (
        <>
          <SidebarItem
            icon={<Settings />}
            active={spaceSettingsActive}
            onClick={() => dispatch({ type: 'TOGGLE', pane: spaceSettingsPane })}
            toggle
          >
            <FormattedMessage defaultMessage="Space Settings" />
          </SidebarItem>
        </>
      )}
    </div>
  );
};
