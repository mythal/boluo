import { css } from '@emotion/react';
import styled from '@emotion/styled';
import * as React from 'react';
import { useMemo, useState } from 'react';
import UserPlus from '../../assets/icons/user-plus.svg';
import { useChannelId } from '../../hooks/useChannelId';
import { useUsersStatus } from '../../hooks/useUsersStatus';
import { useSelector } from '../../store';
import { roundedSm, textSm, uiShadow } from '../../styles/atoms';
import { blue, gray } from '../../styles/colors';
import { type Id } from '../../utils/id';
import Icon from '../atoms/Icon';
import InviteChannelMemberDialog from './InviteChannelMemberDialog';
import MemberListItem from './MemberListItem';

const Container = styled.div`
  ${roundedSm};
  background-color: ${blue['900']};
  ${uiShadow};
  max-height: 60vh;
  overflow-y: auto;
`;

const invite = css`
  ${textSm};
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 100%;
  min-width: 14rem;
  &:hover {
    background-color: ${gray['800']};
  }
  &:active {
    background-color: ${gray['900']};
  }
`;

interface Props {
  spaceId: Id;
}

function MemberList({ spaceId }: Props) {
  return null;
}

export default React.memo(MemberList);
