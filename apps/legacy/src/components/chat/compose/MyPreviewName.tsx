import { css } from '@emotion/react';
import styled from '@emotion/styled';
import Prando from 'prando';
import * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Gamemaster from '../../../assets/icons/gamemaster.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import { fontBold, gap, inline, mL, mR, relative, spacingN, textSm } from '../../../styles/atoms';
import { gray } from '../../../styles/colors';
import { genColor } from '../../../utils/game';
import { encodeUuid, Id } from '../../../utils/id';
import Icon from '../../atoms/Icon';
import Tooltip from '../../atoms/Tooltip';
import { chatContentLineHeight } from '../styles';

interface Props {
  master: boolean;
}

const Container = styled.span`
  ${[mR(1), chatContentLineHeight]};

  & .user-panel {
    visibility: visible;
  }
`;

const NameLink = styled(Link)`
  ${[fontBold, relative]};
  text-decoration: none;
`;

const colorMap: Record<string, string> = {};

const masterIconStyle = css`
  ${[mL(0.5)]};
  color: ${gray['500']};
`;

const nicknameStyle = css`
  ${textSm};
  user-select: none;
`;

const nameInputStyle = css`
  color: ${gray['100']};
  background-color: ${gray['700']};
  border: 1px solid ${gray['600']};
  padding: ${spacingN(1)};
  border-radius: 2px;
  &:focus {
    outline: none;
    border-color: ${gray['500']};
  }
`;

function MyPreviewName() {
  const dispatch = useDispatch();
  const channelId = useChannelId();
  const myId = useSelector((state) => state.profile!.user.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const characterName: string = useSelector(
    (state) => state.profile?.channels.get(channelId)?.member.characterName ?? '',
  );
  const isMaster: boolean = useSelector(
    (state) => state.profile?.channels.get(channelId)?.member.isMaster ?? false,
  );
  const inGame = useSelector((state) => state.chatStates.get(channelId)!.compose.inGame);
  const inputName = useSelector((state) => state.chatStates.get(channelId)!.compose.inputName);
  let name = nickname;
  if (inGame) {
    name = inputName;
  }
  const color = useMemo(() => {
    const rng = new Prando(myId);
    return genColor(rng);
  }, [myId]);
  const handleNameInput: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      dispatch({ type: 'SET_INPUT_NAME', name: e.target.value.trim(), pane: channelId });
    },
    [channelId, dispatch],
  );
  return (
    <Container>
      <div css={[relative, inline]}>
        {inGame && (
          <input
            placeholder={characterName}
            css={nameInputStyle}
            value={name}
            onChange={handleNameInput}
          />
        )}
        {!inGame && <span style={{ color }}>{nickname}</span>}

        {name.length === 0 && inGame && !characterName && (
          <Tooltip css={nicknameStyle} x={'right'} className="user-panel">
            需要一个名字
          </Tooltip>
        )}
      </div>
      {isMaster && <Icon css={masterIconStyle} icon={Gamemaster} />}
    </Container>
  );
}

export default React.memo(MyPreviewName);
