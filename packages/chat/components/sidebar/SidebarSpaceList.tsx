import { Space } from 'api';
import { useQueryMySpaces } from 'common';
import { useSetAtom } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { routeAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';

interface Props {
}

const SidebarSpaceItem: FC<{ space: Space }> = ({ space }) => {
  const setRoute = useSetAtom(routeAtom);
  const handleClick = () => {
    setRoute({ type: 'SPACE', spaceId: space.id });
  };
  return (
    <SidebarItem
      onClick={handleClick}
    >
      {space.name}
    </SidebarItem>
  );
};

export const SidebarSpaceList: FC<Props> = () => {
  const { data: spacesWithMemberData } = useQueryMySpaces();
  return (
    <div>
      <div className="py-2 px-4 text-surface-600 flex justify-between items-center text-sm">
        <span>
          <FormattedMessage defaultMessage="Switch Spaces" />
        </span>
      </div>
      {spacesWithMemberData?.map(({ space }) => (
        <SidebarSpaceItem
          key={space.id}
          space={space}
        />
      ))}
    </div>
  );
};
