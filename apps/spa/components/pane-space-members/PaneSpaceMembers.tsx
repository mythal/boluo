import { Users } from '@boluo/icons';
import { type FC, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMySpaceMember } from '@boluo/hooks/useQueryMySpaceMember';
import { useQuerySpace } from '@boluo/hooks/useQuerySpace';
import { HeaderTab, type TabItem } from '@boluo/ui/HeaderTab';
import { InviteSpaceMember } from '../InviteSpaceMember';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { SpaceMemberListTab } from './SpaceMemberListTab';

interface Props {
  spaceId: string;
}

type MembersTab = 'LIST' | 'INVITATION';

const MembersTabItems: TabItem[] = [
  { id: 'LIST', label: 'List' },
  { id: 'INVITATION', label: 'Invitation' },
];

export const PaneSpaceMembers: FC<Props> = ({ spaceId }) => {
  const { data: space } = useQuerySpace(spaceId);
  const [tab, setTab] = useState<MembersTab>('LIST');
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const title = (
    <FormattedMessage
      defaultMessage='Members of "{spaceName}" Space'
      values={{ spaceName: space?.name ?? '...' }}
    />
  );
  if (mySpaceMember?.isAdmin !== true) {
    return (
      <PaneBox header={<PaneHeaderBox icon={<Users />}>{title}</PaneHeaderBox>}>
        <SpaceMemberListTab spaceId={spaceId} spaceOwnerId={space?.ownerId} />
      </PaneBox>
    );
  }

  return (
    <PaneBox
      header={
        <PaneHeaderBox
          icon={<Users />}
          extra={<HeaderTab value={tab} onChange={setTab} tabItems={MembersTabItems} />}
        >
          {title}
        </PaneHeaderBox>
      }
    >
      {tab === 'INVITATION' && (
        <div className="p-pane">
          <InviteSpaceMember spaceId={spaceId} />
        </div>
      )}
      {tab === 'LIST' && <SpaceMemberListTab spaceId={spaceId} spaceOwnerId={space?.ownerId} />}
    </PaneBox>
  );
};

export default PaneSpaceMembers;
