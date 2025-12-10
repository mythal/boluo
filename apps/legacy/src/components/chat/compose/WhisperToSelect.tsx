import * as React from 'react';
import { useState } from 'react';
import Select from 'react-select';
import { useChannelId } from '../../../hooks/useChannelId';
import { type UserItem } from '../../../reducers/chatState';
import { useDispatch, useSelector } from '../../../store';
import { mB, selectTheme } from '../../../styles/atoms';
import { HelpText } from '../../atoms/HelpText';
import Text from '../../atoms/Text';
import Dialog from '../../molecules/Dialog';

interface Props {
  dismiss: () => void;
}

function WhisperToSelect({ dismiss }: Props) {
  const channelId = useChannelId();
  const dispatch = useDispatch();
  const whisperTo = useSelector((state) => state.chatStates.get(channelId)!.compose.whisperTo);
  const channelMembers = useSelector((state) => state.chatStates.get(channelId)!.members);
  const [values, setValues] = useState<UserItem[] | undefined | null>(whisperTo);
  const options: UserItem[] = channelMembers.map((member) => {
    let label = member.user.nickname;
    if (member.channel.characterName.length > 0) {
      label = `${member.channel.characterName} (${label})`;
    }
    return {
      value: member.user.id,
      label,
    };
  });
  const onSubmit = () => {
    dispatch({ type: 'SET_WHISPER_TO', pane: channelId, whisperTo: values });
    dismiss();
  };
  const isWhisper = values !== undefined && values != null;
  const toggleIsWhisper: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.checked) {
      setValues([]);
    } else {
      setValues(null);
    }
  };
  return (
    <Dialog title="悄悄话" confirmText="设定" confirm={onSubmit} dismiss={dismiss} noOverflow>
      <Text>
        <label>
          <input checked={isWhisper} onChange={toggleIsWhisper} type="checkbox" /> 是否说悄悄话？
        </label>
      </Text>
      {isWhisper && (
        <Select<UserItem, true>
          value={values}
          isMulti
          options={options}
          theme={selectTheme}
          onChange={(options) => setValues([...options])}
          css={mB(2)}
          placeholder={`悄悄说给...`}
        />
      )}
      <HelpText>主持人能查看所有的悄悄话。</HelpText>
      <HelpText>如果不选中自己，自己也无法看到自己消息内容，可以用作暗骰。</HelpText>
    </Dialog>
  );
}

export default WhisperToSelect;
