import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTitleWithResult } from '@/hooks';
import Badge from '../atoms/Badge';
import Button, { buttonStyle } from '../atoms/Button';
import { alignItemCenter, flex, inlineBlock, m, mB, mL, mR, mT, p, preLine, text3Xl } from '@/styles/atoms';
import userCog from '@/assets/icons/user-cog.svg';
import Icon from '../atoms/Icon';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import ManageSpace from '../organisms/ManageSpace';
import { decodeUuid } from '@/utils/id';
import { useDispatch, useSelector } from '@/store';
import { loadSpace } from '@/actions/ui';
import { SpaceWithRelated } from '@/api/spaces';
import GotoSpaceLink from '@/components/molecules/GotoSpaceLink';
import { AppResult } from '@/api/request';
import { errLoading } from '@/api/error';
import styled from '@emotion/styled';

interface Params {
  id: string;
}

const OperatorBar = styled.div`
  ${mT(6)};
  display: flex;
  align-items: stretch;
  // justify-content: space-between;
`;

const SpaceTitle = styled.h1`
  ${[inlineBlock, text3Xl, m(0), p(0)]};
  font-weight: normal;
  line-height: 1.25em;
`;

function SpacePage() {
  let { id } = useParams<Params>();
  id = decodeUuid(id);
  const [managing, setManaging] = useState(false);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadSpace(id));
  }, [id, dispatch]);
  const result: AppResult<SpaceWithRelated> = useSelector((state) => state.ui.spaceSet.get(id, errLoading()));
  useTitleWithResult<SpaceWithRelated>(result, ({ space }) => space.name);
  const myMember = useSelector((state) => state.profile?.spaces.get(id)?.member);
  if (!result.isOk) {
    return <RenderError error={result.value} more404 />;
  }
  const { space, members, channels } = result.value;
  const stopManage = () => setManaging(false);
  return (
    <>
      <div css={[flex, alignItemCenter, mB(6)]}>
        <SpaceTitle>{space.name}</SpaceTitle>
        <Badge css={[mL(3)]} color={'#375942'}>
          {members.length} 名成员
        </Badge>
      </div>
      <div css={[preLine, mT(2)]}>{space.description}</div>
      <OperatorBar>
        <GotoSpaceLink css={[mR(2)]} isMember={Boolean(myMember)} spaceId={space.id} />
        {myMember?.isAdmin && (
          <Button data-small css={mR(1)} onClick={() => setManaging(true)}>
            <Icon sprite={userCog} /> 管理
          </Button>
        )}
        <JoinSpaceButton css={buttonStyle} data-small id={space.id} />
        <LeaveSpaceButton css={buttonStyle} data-small id={space.id} name={space.name} />
      </OperatorBar>
      {managing && myMember && (
        <ManageSpace space={space} channels={channels} members={members} my={myMember} dismiss={stopManage} />
      )}
    </>
  );
}

export default SpacePage;
