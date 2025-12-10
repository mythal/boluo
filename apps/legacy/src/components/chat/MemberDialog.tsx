import { css } from '@emotion/react';
import { useAtom } from 'jotai';
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../../api/request';
import UserMinus from '../../assets/icons/user-minus.svg';
import { userDialogAtom } from '../../states/userDialog';
import { useDispatch, useSelector } from '../../store';
import { color, flex, fontBold, mB, mR, mT, pX, roundedSm, textXl } from '../../styles/atoms';
import { gray, primary } from '../../styles/colors';
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

const nameLink = css`
  ${[fontBold, textXl, mR(1)]};
  text-decoration: none;
  color: ${primary['400']};
  line-height: 1em;
`;

const nameContainer = css`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  ${pX(4)};
`;

const bio = css`
  line-height: 1.4em;
`;

function MemberDialog({ userId, spaceId, dismiss }: Props) {
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
      <Dialog dismiss={dismiss} mask>
        <div css={[mB(4), flex]}>
          <Avatar css={roundedSm} size="5rem" id={user.avatarId} />
          <div css={nameContainer}>
            <div>
              <Link to={`/profile/${encodeUuid(user.id)}`} css={[nameLink]}>
                {user.nickname}
              </Link>
              <MemberTags spaceMember={spaceMember} spaceOwnerId={spaceOwnerId} />
            </div>
            <div css={[color(gray['500'])]}>{user.username}</div>
          </div>
        </div>
        <div css={bio}>{user.bio}</div>

        {imAdmin && (
          <div css={[mT(4)]}>
            {!spaceMember.isAdmin && (
              <Button data-variant="danger" onClick={() => showKickDialog(true)}>
                <Icon css={mR(1)} icon={UserMinus} />
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
