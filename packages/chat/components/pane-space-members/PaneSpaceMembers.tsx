import { Users } from '@boluo/icons';
import { FC, Suspense, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Loading } from '@boluo/ui/Loading';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { useQuerySpace } from '../../hooks/useQuerySpace';
import { ClosePaneButton } from '../ClosePaneButton';
import { HeaderTab, TabItem } from '../HeaderTab';
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
    <FormattedMessage defaultMessage='Members of "{spaceName}" Space' values={{ spaceName: space?.name ?? '...' }} />
  );
  if (mySpaceMember?.isAdmin !== true) {
    return (
      <PaneBox header={<PaneHeaderBox icon={<Users />}>{title}</PaneHeaderBox>}>
        <Suspense fallback={<Loading />}>
          <SpaceMemberListTab spaceId={spaceId} spaceOwnerId={space?.ownerId} />
        </Suspense>
      </PaneBox>
    );
  }

  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Users />} extra={<HeaderTab value={tab} onChange={setTab} tabItems={MembersTabItems} />}>
          {title}
        </PaneHeaderBox>
      }
    >
      <Suspense fallback={<Loading />}>
        {tab === 'INVITATION' && (
          <div className="p-4">
            <InviteSpaceMember spaceId={spaceId} />
          </div>
        )}
        {tab === 'LIST' && <SpaceMemberListTab spaceId={spaceId} spaceOwnerId={space?.ownerId} />}
      </Suspense>
    </PaneBox>
  );
};

export default PaneSpaceMembers;
