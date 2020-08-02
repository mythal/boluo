import * as React from 'react';
import { css } from '@emotion/core';
import { breakpoint, largeInput, mediaQuery, mT, selectTheme, spacingN, widthFull } from '@/styles/atoms';
import { Channel, EditChannel, Member } from '@/api/channels';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { AppError } from '@/api/error';
import DiceSelect, { DiceOption } from '@/components/molecules/DiceSelect';
import { useSelector } from '@/store';
import { PanelTitle } from '@/components/atoms/PanelTitle';
import Panel from '@/components/molecules/Panel';
import { RenderError } from '@/components/molecules/RenderError';
import { Label } from '@/components/atoms/Label';
import Input from '@/components/atoms/Input';
import { channelNameValidation, channelTopicValidation } from '@/validators';
import { ErrorMessage } from '@/components/atoms/ErrorMessage';
import { HelpText } from '@/components/atoms/HelpText';
import TextArea from '@/components/atoms/TextArea';
import Button from '@/components/atoms/Button';
import { post } from '@/api/request';
import Text from '@/components/atoms/Text';
import Select, { ValueType } from 'react-select';
import { Set } from 'immutable';

interface Props {
  channel: Channel;
  dismiss: () => void;
}

const panelStyle = css`
  width: ${spacingN(64)};
  ${mediaQuery(breakpoint.md)} {
    width: ${spacingN(100)};
  }
`;

interface FormData {
  name: string;
  topic: string;
}

interface MemberOption {
  label: string;
  value: string;
}

function makeMemberOption({ user }: Member): MemberOption {
  return { label: user.nickname, value: user.id };
}

function ManageChannel({ channel, dismiss }: Props) {
  const channelId = channel.id;
  const { register, handleSubmit, errors } = useForm<FormData>();
  const [editError, setEditError] = useState<AppError | null>(null);
  const [defaultDice, setDefaultDice] = useState<DiceOption | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const members = useSelector((state) => state.chat?.members) || [];
  const spaceMember = useSelector((state) => state.profile?.spaces.get(channel.spaceId)?.member);
  const currentMaster = members.filter((member) => member.channel.isMaster).map(makeMemberOption);
  const [selectedMember, setSelectedMember] = useState<MemberOption[]>(currentMaster);
  const memberOptions = members.map(makeMemberOption);
  if (!spaceMember || !spaceMember.isAdmin) {
    return (
      <Panel css={panelStyle} dismiss={dismiss} mask>
        <PanelTitle>管理频道</PanelTitle>
        <Text>没有权限管理频道</Text>
      </Panel>
    );
  }

  const onSubmit = async ({ name, topic }: FormData) => {
    const defaultDiceType = defaultDice?.value;
    const current = Set(currentMaster.map((member) => member.value));
    const selected = Set(selectedMember.map((member) => member.value));
    const grantMasters = selected.subtract(current).toArray();
    const removeMasters = current.subtract(selected).toArray();
    const editChannel: EditChannel = { name, topic, channelId, defaultDiceType, grantMasters, removeMasters };
    setSubmitting(true);
    const result = await post('/channels/edit', editChannel);
    setSubmitting(false);
    if (!result.isOk) {
      setEditError(result.value);
      return;
    }
    dismiss();
  };
  const handleChange = (value: ValueType<MemberOption>) => {
    const values = (value || []) as MemberOption[];
    setSelectedMember(values);
  };
  return (
    <Panel css={panelStyle} dismiss={dismiss} mask>
      <PanelTitle>管理频道</PanelTitle>
      {editError && <RenderError error={editError} variant="component" />}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <Label htmlFor="name">频道名</Label>
          <Input
            css={largeInput}
            id="name"
            name="name"
            defaultValue={channel.name}
            ref={register(channelNameValidation(channel.spaceId, channel.name))}
          />
          {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
        </div>
        <div>
          <Label htmlFor="defaultDiceType">默认骰子</Label>
          <DiceSelect
            id="defaultDiceType"
            name="defaultDiceType"
            defaultDiceType={channel.defaultDiceType}
            value={defaultDice}
            onChange={setDefaultDice}
          />
          <HelpText>
            当输入 <code>1d20</code> 的时候可以简化成 <code>1d</code>。
          </HelpText>
        </div>
        <div>
          <Label>话题</Label>
          <TextArea
            id="topic"
            defaultValue={channel.topic}
            name="topic"
            placeholder="例如：在你们护送物资的时候，四只地精埋伏你们于路边"
            ref={register(channelTopicValidation)}
          />
          <HelpText>话题可以用来记录和提醒你们当前专注于什么。</HelpText>
          {errors.topic && <ErrorMessage>{errors.topic.message}</ErrorMessage>}
        </div>
        <div>
          <Label>游戏主持人</Label>
          <Select isMulti value={selectedMember} onChange={handleChange} options={memberOptions} theme={selectTheme} />
        </div>
        <Button css={[mT(4), widthFull]} data-variant="primary" disabled={submitting} type="submit">
          提交修改
        </Button>
      </form>
    </Panel>
  );
}

export default ManageChannel;
