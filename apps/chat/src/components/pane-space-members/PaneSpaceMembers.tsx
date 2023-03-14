import { Users } from 'icons';
import { FC, Suspense, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { Loading } from 'ui';
import { useSpace } from '../../hooks/useSpace';
import { ClosePaneButton } from '../ClosePaneButton';
import { HeaderTab, TabItem } from '../HeaderTab';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { InviteSpaceMemberTab } from './InviteSpaceMemberTab';
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
  const space = useSpace(spaceId);
  const [tab, setTab] = useState<MembersTab>('LIST');
  return (
    <PaneBox>
      <PaneHeaderBox
        operators={<ClosePaneButton />}
        icon={<Users />}
        extra={<HeaderTab value={tab} onChange={setTab} tabItems={MembersTabItems} />}
      >
        <FormattedMessage
          defaultMessage="Members of &quot;{spaceName}&quot; Space"
          values={{ spaceName: space.name }}
        />
      </PaneHeaderBox>
      <Suspense fallback={<Loading />}>
        {tab === 'INVITATION' && <InviteSpaceMemberTab spaceId={spaceId} />}
        {tab === 'LIST' && <SpaceMemberListTab spaceId={spaceId} />}
      </Suspense>
    </PaneBox>
  );
};
