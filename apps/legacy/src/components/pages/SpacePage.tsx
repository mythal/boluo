import * as React from 'react';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import { errLoading } from '../../api/error';
import { type AppResult, get } from '../../api/request';
import { type SpaceWithRelated } from '../../api/spaces';
import Clipboard from '@boluo/icons/legacy/Clipboard';
import UserCog from '@boluo/icons/legacy/UserCog';
import UserPlus from '@boluo/icons/legacy/UserPlus';
import GotoSpaceLink from '../../components/molecules/GotoSpaceLink';
import { useTitleWithResult } from '../../hooks/useTitle';
import { useDispatch, useSelector } from '../../store';
import { throwErr } from '../../utils/errors';
import { decodeUuid, encodeUuid } from '../../utils/id';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import Input from '../atoms/Input';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import ManageSpace from '../organisms/ManageSpace';
import NotFound from './NotFound';

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

  const copyInviteLink = async () => {
    const node = inviteLinkInput.current!;
    try {
      await navigator.clipboard.writeText(inviteLink ?? '');
    } catch {
      node.select();
      document.execCommand('copy');
    }
  };
  return (
    <React.Fragment>
      <div className="mb-6 flex items-center">
        <h1 className="legacy-space-title">{space.name}</h1>
      </div>
      <div className="mt-2 mb-4 whitespace-pre-line">{space.description}</div>
      {myMember?.isAdmin && inviteLink && (
        <div className="flex">
          <Input ref={inviteLinkInput} value={inviteLink} readOnly />
          <Button
            className="legacy-space-copy-button"
            size="small"
            type="button"
            onClick={copyInviteLink}
          >
            <Icon icon={Clipboard} /> 复制
          </Button>
        </div>
      )}
      <div className="legacy-space-operator mt-2 flex flex-col items-start sm:flex-row sm:items-center">
        {(myMember || space.allowSpectator) && (
          <GotoSpaceLink className="mr-2" isMember={Boolean(myMember)} spaceId={space.id} />
        )}
        {myMember?.isAdmin && (
          <Button
            className="legacy-space-operator-action"
            onClick={getInviteLink}
            size="small"
            type="button"
          >
            <Icon icon={UserPlus} /> 邀请
          </Button>
        )}
        {myMember?.isAdmin && (
          <Button
            className="legacy-space-operator-action"
            size="small"
            type="button"
            onClick={() => setManaging(true)}
          >
            <Icon icon={UserCog} /> 管理
          </Button>
        )}
        {(space.isPublic || space.ownerId === myId || token) && (
          <JoinSpaceButton size="small" id={space.id} token={token} />
        )}
        <LeaveSpaceButton size="small" id={space.id} name={space.name} />
      </div>
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
  const { id: encodedId, token: encodedToken } = useParams();
  if (!encodedId) {
    const result: AppResult<SpaceWithRelated> = errLoading();
    if (!result.isOk) {
      return <RenderError error={result.value} more404 />;
    }
    return null;
  }
  const id = decodeUuid(encodedId, { parameter: 'space_id' });
  const token = encodedToken ? decodeUuid(encodedToken, { parameter: 'invite_token' }) : undefined;
  if (!id || (encodedToken && !token)) {
    return <NotFound />;
  }
  return <SpacePageRender id={id} token={token} />;
}

export default SpacePage;
