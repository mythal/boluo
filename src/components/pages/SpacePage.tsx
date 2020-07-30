import * as React from 'react';
import { useEffect, useState } from 'react';
import Title from '../atoms/Title';
import { useParams } from 'react-router-dom';
import { useIsLoggedIn, useTitleWithResult } from '@/hooks';
import Tag from '../atoms/Tag';
import Button from '../atoms/Button';
import { floatRight, mR, mT, pB, preLine } from '@/styles/atoms';
import userCog from '@/assets/icons/user-cog.svg';
import Icon from '../atoms/Icon';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import ManageSpace from '../organisms/ManageSpace';
import { decodeUuid } from '@/utils/id';
import { useDispatch, useSelector } from '@/store';
import { loadSpace, resetUi } from '@/actions/ui';
import { SpaceWithRelated } from '@/api/spaces';
import GotoSpaceLink from '@/components/molecules/GotoSpaceLink';

interface Params {
  id: string;
}

const buttonStyle = [mR(1)];

function SpacePage() {
  let { id } = useParams<Params>();
  id = decodeUuid(id);
  const [managing, setManaging] = useState(false);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadSpace(id));
    return () => {
      dispatch(resetUi());
    };
  }, [id, dispatch]);
  const result = useSelector((state) => state.ui.spacePage);
  useTitleWithResult<SpaceWithRelated>(result, ({ space }) => space.name);
  const isLoggedIn = useIsLoggedIn();
  const myMember = useSelector((state) => state.profile?.spaces.get(id)?.member);
  if (!result.isOk) {
    return <RenderError error={result.value} more404 />;
  }
  const { space, members, channels } = result.value;
  const stopManage = () => setManaging(false);
  return (
    <>
      <div css={[floatRight, pB(4)]}>
        {myMember?.isAdmin && (
          <Button css={buttonStyle} onClick={() => setManaging(true)}>
            <Icon sprite={userCog} /> 管理
          </Button>
        )}
        {isLoggedIn && !myMember && <JoinSpaceButton css={buttonStyle} id={space.id} />}
        <LeaveSpaceButton css={buttonStyle} id={space.id} name={space.name} />
      </div>
      <Title>{space.name}</Title>
      <div>
        <Tag color="#38A169">{members.length} 名成员</Tag>
      </div>
      <div css={[preLine, mT(2)]}>{space.description}</div>
      <div css={[mT(6)]}>
        <GotoSpaceLink isMember={Boolean(myMember)} spaceId={space.id} />
      </div>
      {managing && myMember && (
        <ManageSpace space={space} channels={channels} members={members} my={myMember} dismiss={stopManage} />
      )}
    </>
  );
}

export default SpacePage;
