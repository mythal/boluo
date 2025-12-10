import styled from '@emotion/styled';
import * as React from 'react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import { errLoading } from '../../api/error';
import { type AppResult, get } from '../../api/request';
import { type SpaceWithRelated } from '../../api/spaces';
import Clipboard from '../../assets/icons/clipboard.svg';
import UserCog from '../../assets/icons/user-cog.svg';
import UserPlus from '../../assets/icons/user-plus.svg';
import GotoSpaceLink from '../../components/molecules/GotoSpaceLink';
import { useTitleWithResult } from '../../hooks/useTitle';
import { useDispatch, useSelector } from '../../store';
import {
  alignItemCenter,
  breakpoint,
  flex,
  inlineBlock,
  m,
  mB,
  mediaQuery,
  mL,
  mR,
  mT,
  p,
  preLine,
  text3Xl,
} from '../../styles/atoms';
import { throwErr } from '../../utils/errors';
import { decodeUuid, encodeUuid } from '../../utils/id';
import Button, { buttonStyle } from '../atoms/Button';
import Icon from '../atoms/Icon';
import Input from '../atoms/Input';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import ManageSpace from '../organisms/ManageSpace';

const OperatorBar = styled.div`
  ${mT(2)};
  display: flex;

  ${mediaQuery(breakpoint.sm)} {
    flex-direction: row;
    align-items: center;
  }
  flex-direction: column;
  align-items: flex-start;
  & > * {
    ${mB(1)}
  }

  // justify-content: space-between;
`;

const SpaceTitle = styled.h1`
  ${[inlineBlock, text3Xl, m(0), p(0)]};
  font-weight: normal;
  line-height: 1.25em;
`;

function SpacePageRender({ id, token }: { id: string; token: string | undefined }) {
  const [managing, setManaging] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const inviteLinkInput = useRef<HTMLInputElement>(null);

  const { data } = useSWR(['/spaces/query_with_related' as const, id], ([path, id]) =>
    get(path, { id, token }),
  );
  const result: AppResult<SpaceWithRelated> = data ?? errLoading();

  useTitleWithResult<SpaceWithRelated>(result, ({ space }) => space.name);
  const myId = useSelector((state) => state.profile?.user.id);
  const myMember = useSelector((state) => state.profile?.spaces.get(id)?.member);
  const dispatch = useDispatch();
  if (!result.isOk) {
    return <RenderError error={result.value} more404 />;
  }
  const { space, members, channels } = result.value;
  const stopManage = () => setManaging(false);
  const getInviteLink = async () => {
    const result = await get('/spaces/token', { id });
    if (result.isErr) {
      throwErr(dispatch)(result.value);
      return;
    }
    const token = result.value;
    setInviteLink(`${location.origin}/join/space/${encodeUuid(id)}/${encodeUuid(token)}`);
  };

  const copyInviteLink = () => {
    const node = inviteLinkInput.current!;
    node.select();
    document.execCommand('copy');
  };
  return (
    <React.Fragment>
      <div css={[flex, alignItemCenter, mB(6)]}>
        <SpaceTitle>{space.name}</SpaceTitle>
      </div>
      <div css={[preLine, mT(2), mB(4)]}>{space.description}</div>
      {myMember?.isAdmin && inviteLink && (
        <div css={flex}>
          <Input ref={inviteLinkInput} value={inviteLink} readOnly />
          <Button css={mL(1)} data-size="small" onClick={copyInviteLink}>
            <Icon icon={Clipboard} /> 复制
          </Button>
        </div>
      )}
      <OperatorBar>
        {(myMember || space.allowSpectator) && (
          <GotoSpaceLink css={[mR(2)]} isMember={Boolean(myMember)} spaceId={space.id} />
        )}
        {myMember?.isAdmin && (
          <Button onClick={getInviteLink} data-size="small" css={mR(1)}>
            <Icon icon={UserPlus} /> 邀请
          </Button>
        )}
        {myMember?.isAdmin && (
          <Button data-small css={mR(1)} onClick={() => setManaging(true)}>
            <Icon icon={UserCog} /> 管理
          </Button>
        )}
        {(space.isPublic || space.ownerId === myId || token) && (
          <JoinSpaceButton css={buttonStyle} data-small id={space.id} token={token} />
        )}
        <LeaveSpaceButton css={buttonStyle} data-small id={space.id} name={space.name} />
      </OperatorBar>
      {managing && myMember && (
        <ManageSpace
          space={space}
          channels={channels}
          members={members}
          my={myMember}
          dismiss={stopManage}
        />
      )}
    </React.Fragment>
  );
}

function SpacePage() {
  let { id, token } = useParams();
  if (!id) {
    const result: AppResult<SpaceWithRelated> = errLoading();
    if (!result.isOk) {
      return <RenderError error={result.value} more404 />;
    }
    return null;
  }
  id = decodeUuid(id);
  token = token ? decodeUuid(token) : undefined;
  return <SpacePageRender id={id} token={token} />;
}

export default SpacePage;
