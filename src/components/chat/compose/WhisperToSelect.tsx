import * as React from 'react';
import { useState } from 'react';
import { ComposeDispatch, update, UserItem } from './reducer';
import { useSelector } from '../../../store';
import { usePane } from '../../../hooks/usePane';
import { mB, selectTheme } from '../../../styles/atoms';
import Dialog from '../../molecules/Dialog';
import { HelpText } from '../../atoms/HelpText';

const Select = React.lazy(() => import('react-select'));

interface Props {
  whisperTo: UserItem[];
  composeDispatch: ComposeDispatch;
  dismiss: () => void;
}

function WhisperToSelect({ whisperTo, composeDispatch, dismiss }: Props) {
  const pane = usePane();
  const channelMembers = useSelector((state) => state.chatPane[pane]!.members);
  const [values, setValues] = useState<UserItem[]>(whisperTo);
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
  return (
    <Dialog title="悄悄话" confirmText="修改" confirm={onSubmit} dismiss={dismiss}>
      <Select
        value={values}
        isMulti
        options={options}
        theme={selectTheme}
        onChange={setValues}
        css={mB(2)}
        placeholder={`悄悄说给...`}
      />
      <HelpText>主持人能查看所有的悄悄话</HelpText>
    </Dialog>
  );
}

export default WhisperToSelect;
