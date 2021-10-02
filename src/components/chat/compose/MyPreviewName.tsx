import * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import Prando from 'prando';
import { encodeUuid, Id } from '../../../utils/id';
import styled from '@emotion/styled';
import { Link } from 'react-router-dom';
import { fontBold, inline, mL, mR, relative, textSm } from '../../../styles/atoms';
import Icon from '../../atoms/Icon';
import masterIcon from '../../../assets/icons/gamemaster.svg';
import { css } from '@emotion/core';
import { gray } from '../../../styles/colors';
import { chatContentLineHeight } from '../styles';
import Tooltip from '../../atoms/Tooltip';
import { useSelector } from '../../../store';
import { useChannelId } from '../../../hooks/useChannelId';
import { genColor } from '../../../utils/game';
import { useAtomValue } from 'jotai/utils';
import { inGameAtom, inputNameAtom, isActionAtom } from './state';
import { useAtom } from 'jotai';
import WhisperTo from './WhisperTo';
import { InPreviewActionButton } from './InPreviewActionButton';

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

const nameInputStyle = css``;

function MyPreviewName() {
  const channelId = useChannelId()!;
  const myId = useSelector((state) => state.profile!.user.id);
  const nickname = useSelector((state) => state.profile!.user.nickname);
  const characterName: string = useSelector(
    (state) => state.profile?.channels.get(channelId)?.member.characterName ?? ''
  );
  const isMaster: boolean = useSelector((state) => state.profile?.channels.get(channelId)?.member.isMaster ?? false);
  const inGame = useAtomValue(inGameAtom, channelId);
  const [inputName, setInputName] = useAtom(inputNameAtom, channelId);
  let name = nickname;
  if (inGame) {
    if (inputName.length > 0) {
      name = inputName;
    } else {
      name = characterName;
    }
  }
  const color = useMemo(() => {
    const rng = new Prando(myId);
    return genColor(rng);
  }, [myId]);
  const handleNameInput: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const value = e.target.value.trim();
      if (value === characterName) {
        setInputName('');
      } else {
        setInputName(e.target.value.trim());
      }
    },
    [setInputName]
  );
  return (
    <Container>
      <div css={[relative, inline]}>
        {inGame && <input css={nameInputStyle} value={name} onChange={handleNameInput} />}
        {!inGame && <span style={{ color }}>{nickname}</span>}

        {name.length === 0 && inGame && (
          <Tooltip css={nicknameStyle} x={'right'} className="user-panel">
            需要一个名字
          </Tooltip>
        )}
      </div>
      {isMaster && <Icon css={masterIconStyle} sprite={masterIcon} />}
    </Container>
  );
}

export default React.memo(MyPreviewName);
