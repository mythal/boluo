import * as React from 'react';
import { useState } from 'react';
import { User } from '../../api/users';
import { css } from '@emotion/core';
import { gray, primary } from '../../styles/colors';
import { color, flex, fontBold, mB, mR, mT, pX, roundedSm, textXl } from '../../styles/atoms';
import { Link } from 'react-router-dom';
import { encodeUuid } from '../../utils/id';
import Avatar from '../molecules/Avatar';
import Dialog from '../molecules/Dialog';
import Button from '../atoms/Button';
import removeMember from '../../assets/icons/user-minus.svg';
import Icon from '../atoms/Icon';
import Text from '../atoms/Text';
import { post } from '../../api/request';
import { SpaceMember } from '../../api/spaces';
import { useDispatch } from '../../store';
import { throwErr } from '../../utils/errors';

interface Props {
  user: User;
  spaceMember: SpaceMember;
  className?: string;
  dismiss: () => void;
  imAdmin: boolean;
}

const nameLink = css`
  ${[fontBold, textXl]};
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

function MemberDialog({ user, dismiss, imAdmin, spaceMember }: Props) {
  const [kickDialog, showKickDialog] = useState(false);
  const dispatch = useDispatch();
  const kick = async () => {
    const result = await post('/spaces/kick', {}, { userId: user.id, spaceId: spaceMember.spaceId });
    if (result.isErr) {
      throwErr(dispatch)(result.value);
    }
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
            </div>
            <div css={[color(gray['500'])]}>{user.username}</div>
          </div>
        </div>
        <div css={bio}>{user.bio}</div>

        {imAdmin && (
          <div css={[mT(4)]}>
            {!spaceMember.isAdmin && (
              <Button data-variant="danger" onClick={() => showKickDialog(true)}>
                <Icon css={mR(1)} sprite={removeMember} />
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
