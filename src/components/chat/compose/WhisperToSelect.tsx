import * as React from 'react';
import { useState } from 'react';
import { ComposeDispatch, update, UserItem } from './reducer';
import { useSelector } from '../../../store';
import { usePane } from '../../../hooks/usePane';
import { mB, selectTheme } from '../../../styles/atoms';
import Dialog from '../../molecules/Dialog';
import { HelpText } from '../../atoms/HelpText';
import Text from '../../atoms/Text';

const Select = React.lazy(() => import('react-select'));

interface Props {
  whisperTo: UserItem[] | undefined | null;
  composeDispatch: ComposeDispatch;
  dismiss: () => void;
}

function WhisperToSelect({ whisperTo, composeDispatch, dismiss }: Props) {
  const pane = usePane();
  const channelMembers = useSelector((state) => state.chatPane[pane]!.members);
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
    composeDispatch(update({ whisperTo: values }));
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
    <Dialog title="悄悄话" confirmText="修改" confirm={onSubmit} dismiss={dismiss}>
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
      <HelpText>主持人能查看所有的悄悄话，留空即可。</HelpText>
    </Dialog>
  );
}

export default WhisperToSelect;
