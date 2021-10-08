import * as React from 'react';
import { useState } from 'react';
import { useSelector } from '../../../store';
import { useChannelId } from '../../../hooks/useChannelId';
import { mB, selectTheme } from '../../../styles/atoms';
import Dialog from '../../molecules/Dialog';
import { HelpText } from '../../atoms/HelpText';
import Text from '../../atoms/Text';
import { useAtom } from 'jotai';
import { UserItem, whisperToAtom } from './state';

const Select = React.lazy(() => import('react-select'));

interface Props {
  dismiss: () => void;
}

function WhisperToSelect({ dismiss }: Props) {
  const channelId = useChannelId();
  const [whisperTo, setWhisperTo] = useAtom(whisperToAtom, channelId);
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
    setWhisperTo(values);
    dismiss();
  };
  const isWhisper = values !== undefined && values !== null;
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
        <Select
          value={values}
          isMulti
          options={options}
          theme={selectTheme}
          onChange={setValues}
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
