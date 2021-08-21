import { SpaceMemberWithUser, StatusKind } from '../../api/spaces';
import React from 'react';
import { css } from '@emotion/core';
import { color, pL, pX, pY } from '../../styles/atoms';
import { gray, green } from '../../styles/colors';

interface Props {
  member: SpaceMemberWithUser;
  online: boolean;
}

const itemStyle = css`
  ${pL(8)};
  ${pY(4)};
  display: flex;
  align-items: center;
  position: relative;
  &[data-online='true']::before {
    content: ' ';
    display: inline-block;
    position: absolute;
    width: 0.5em;
    height: 0.5em;
    border-radius: 999px;
    background-color: ${green['400']};
    left: 1em;
  }
  &[data-online='true'] {
    ${color(gray['200'])};
  }
  &[data-online='false'] {
    ${color(gray['700'])};
  }
`;

export const SidebarMemberListItem = ({ member, online }: Props) => {
  return (
    <div css={itemStyle} data-online={String(online)}>
      {member.user.username}
    </div>
  );
};
