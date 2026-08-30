import { useAtom } from 'jotai';
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../../api/request';
import UserMinus from '@boluo/icons/legacy/UserMinus';
import { userDialogAtom } from '../../states/userDialog';
import { useDispatch, useSelector } from '../../store';
import { throwErr } from '../../utils/errors';
import { encodeUuid, type Id } from '../../utils/id';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import Text from '../atoms/Text';
import Avatar from '../molecules/Avatar';
import Dialog from '../molecules/Dialog';
import MemberTags from './MemberTags';

interface Props {
  userId: Id;
  spaceId: Id;
  className?: string;
  dismiss: () => void;
}

function MemberDialog({ userId, spaceId, className, dismiss }: Props) {
  const myId = useSelector((state) => state.profile?.user.id);

  const spaceOwnerId = useSelector((state) => {
    const spaceResult = state.ui.spaceSet.get(spaceId);
    if (spaceResult?.isOk) {
      return spaceResult.value.space.ownerId;
    } else {
      return null;
    }
  });
  const [, setUserDialog] = useAtom(userDialogAtom);
  const members = useSelector((state) => {
    const spaceResult = state.ui.spaceSet.get(spaceId);
    if (spaceResult?.isOk) {
      return spaceResult.value.members;
    }
    return null;
  });
  const [kickDialog, showKickDialog] = useState(false);
  const dispatch = useDispatch();
  if (!members) {
    return null;
  }
  const member = members[userId];
  let imAdmin = false;
  if (myId) {
    const myMember = members[myId];
    if (myMember) {
      imAdmin = myMember.space.isAdmin;
    }
  }

  if (!member) {
    return null;
  }
  const spaceMember = member.space;
  const user = member.user;
  const kick = async () => {
    const result = await post(
      '/spaces/kick',
      {},
      { userId: user.id, spaceId: spaceMember.spaceId },
    );
    if (result.isErr) {
      throwErr(dispatch)(result.value);
    }
    showKickDialog(false);
    setUserDialog(null);
  };
  return (
    <React.Fragment>
      <Dialog className={className} dismiss={dismiss} mask>
        <div className="mb-4 flex">
          <Avatar className="rounded-[3px]" size="5rem" id={user.avatarId} />
          <div className="flex flex-col justify-end px-4">
            <div>
              <Link
                className="text-legacy-primary-400 mr-1 text-[1.25rem] leading-[1em] font-bold no-underline"
                to={`/profile/${encodeUuid(user.id)}`}
              >
                {user.nickname}
              </Link>
              <MemberTags spaceMember={spaceMember} spaceOwnerId={spaceOwnerId} />
            </div>
            <div className="text-legacy-gray-500">{user.username}</div>
          </div>
        </div>
        <div className="leading-[1.4em]">{user.bio}</div>

        {imAdmin && (
          <div className="mt-4">
            {!spaceMember.isAdmin && (
              <Button variant="danger" onClick={() => showKickDialog(true)}>
                <Icon className="mr-1" icon={UserMinus} />
                从位面中放逐
              </Button>
            )}
          </div>
        )}
      </Dialog>
      {kickDialog && (
        <Dialog
          dismiss={() => showKickDialog(false)}
          title="放逐成员"
          confirmButtonVariant="danger"
          confirmText="放逐"
          confirm={kick}
        >
          <Text>
            是否真的要放逐位面成员「{user.nickname}」({user.username})？
          </Text>
        </Dialog>
      )}
    </React.Fragment>
  );
}

export default MemberDialog;
