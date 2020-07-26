import * as React from 'react';
import Title from '../atoms/Title';
import { useParams } from 'react-router-dom';
import { useRegisterFetch, useRefetch, useTitleWithFetchResult } from '../../hooks';
import { get } from '../../api/request';
import { SpaceWithRelated } from '../../api/spaces';
import Tag from '../atoms/Tag';
import Button from '../atoms/Button';
import { useProfile } from '../Provider';
import { mR, mT, preLine, textLg } from '../../styles/atoms';
import binoculars from '../../assets/icons/binoculars.svg';
import teleport from '../../assets/icons/teleport.svg';
import userCog from '../../assets/icons/user-cog.svg';
import Icon from '../atoms/Icon';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import { useState } from 'react';
import ManageSpace from '../organisms/ManageSpace';

interface Params {
  id: string;
}

const buttonStyle = [mR(1), textLg];

function SpacePage() {
  const { id } = useParams<Params>();
  const [managing, setManaging] = useState(false);
  const [result, refetch] = useRegisterFetch<SpaceWithRelated>(id, () => get('/spaces/query_with_related', { id }), [
    id,
  ]);
  useRefetch(refetch, 64);
  useTitleWithFetchResult<SpaceWithRelated>(result, ({ space }) => space.name);
  const profile = useProfile();
  if (!result.isOk) {
    return <RenderError error={result.value} more404 />;
  }
  const { space, members, channels } = result.value;
  const myMember = profile?.spaces.get(id)?.member;
  const stopManage = () => setManaging(false);
  return (
    <>
      <div>
        <Title>{space.name}</Title>
      </div>
      <div>
        <Tag color="#38A169">{members.length} 名成员</Tag>
      </div>
      <div css={[preLine, mT(2)]}>{space.description}</div>
      <div css={[mT(4)]}>
        {myMember ? (
          <Button css={buttonStyle} data-variant="primary">
            <Icon sprite={teleport} /> 进入位面
          </Button>
        ) : (
          <Button css={buttonStyle}>
            <Icon sprite={binoculars} /> 作为旁观者进入
          </Button>
        )}
        {profile && !myMember && <JoinSpaceButton css={buttonStyle} id={space.id} />}
        {myMember?.isAdmin && (
          <Button css={buttonStyle} onClick={() => setManaging(true)}>
            <Icon sprite={userCog} /> 管理位面
          </Button>
        )}
        {myMember && <LeaveSpaceButton css={buttonStyle} id={space.id} name={space.name} />}
      </div>
      {managing && myMember && (
        <ManageSpace space={space} channels={channels} members={members} my={myMember} dismiss={stopManage} />
      )}
    </>
  );
}

export default SpacePage;
