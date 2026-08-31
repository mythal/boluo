import Prando from 'prando';
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import Gamemaster from '@boluo/icons/legacy/Gamemaster';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import { genColor } from '../../../utils/game';
import Icon from '../../atoms/Icon';
import Tooltip from '../../atoms/Tooltip';

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
    <span className="mr-1 leading-[1.6rem]">
      <div className="relative inline">
        {inGame && (
          <input
            className="border-legacy-gray-600 bg-legacy-gray-700 text-legacy-gray-100 focus:border-legacy-gray-500 rounded-[2px] border p-1 focus:outline-none"
            placeholder={characterName}
            value={name}
            onChange={handleNameInput}
          />
        )}
        {!inGame && <span style={{ color }}>{nickname}</span>}

        {name.length === 0 && inGame && !characterName && (
          <Tooltip className="visible text-[0.875rem] select-none" x="right">
            需要一个名字
          </Tooltip>
        )}
      </div>
      {isMaster && <Icon className="text-legacy-gray-500 ml-0.5" icon={Gamemaster} />}
    </span>
  );
}

export default React.memo(MyPreviewName);
