import { Space } from 'api';
import { useQueryMySpaces } from 'common';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useSpace } from '../../hooks/useSpace';
import { useSwitchSpace } from '../../hooks/useSwitchSpace';
import { SidebarItem } from './SidebarItem';

interface Props {
}

const SidebarSpaceItem: FC<{ space: Space }> = ({ space }) => {
  const currentSpace = useSpace();
  const switchSpace = useSwitchSpace();
  return (
    <SidebarItem
      onClick={() => switchSpace(space.id)}
      active={currentSpace?.id === space.id}
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
