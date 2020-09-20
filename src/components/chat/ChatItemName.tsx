import * as React from 'react';
import { useRef } from 'react';
import Prando from 'prando';
import { encodeUuid, Id } from '../../utils/id';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { fontBold, inline, mR, relative, textSm } from '../../styles/atoms';
import { hsl } from 'polished';
import Icon from '../atoms/Icon';
import masterIcon from '../../assets/icons/gamemaster.svg';
import { css } from '@emotion/core';
import { gray } from '../../styles/colors';
import { chatContentLineHeight } from './styles';
import Tooltip from '../atoms/Tooltip';
import { useSelector } from '../../store';
import { usePane } from '../../hooks/usePane';

interface Props {
  name: string;
  master: boolean;
  action: boolean;
  inGame: boolean;
  userId: Id;
}

const Container = styled.span`
  ${[mR(1), chatContentLineHeight]};

  & .user-panel {
    visibility: hidden;
  }

  &:hover .user-panel {
    visibility: visible;
  }
`;

const NameLink = styled(Link)`
  ${[fontBold, relative]};
  text-decoration: none;
`;

const colorMap: Record<string, string> = {};

function genColor(rng: Prando): string {
  return hsl(rng.next(0, 365), rng.next(), rng.next(0.5, 0.8));
}

const masterIconStyle = css`
  ${[mR(1)]};
  color: ${gray['500']};
`;

const nicknameStyle = css`
  ${textSm};
  user-select: none;
`;

function ChatItemName({ name, userId, master }: Props) {
  const pane = usePane();
  const nickname = useSelector(
    (state) => state.chatPane[pane]!.members.find((member) => member.user.id === userId)?.user.nickname
  );
  const linkRef = useRef<HTMLAnchorElement>(null);
  if (!colorMap[name]) {
    const rng = new Prando(userId);
    colorMap[name] = genColor(rng);
  }
  const color = colorMap[name];
  return (
    <Container>
      {master && <Icon css={masterIconStyle} sprite={masterIcon} />}
      <div css={[relative, inline]}>
        <NameLink ref={linkRef} css={{ color }} to={`/profile/${encodeUuid(userId)}`}>
          {name}
        </NameLink>
        {nickname && (
          <Tooltip css={nicknameStyle} className="user-panel">
            {nickname}
          </Tooltip>
        )}
      </div>
    </Container>
  );
}

export default React.memo(ChatItemName);
