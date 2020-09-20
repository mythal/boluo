import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import {
  breakpoint,
  largeInput,
  mediaQuery,
  mR,
  mT,
  mY,
  selectTheme,
  spacingN,
  textSm,
  widthFull,
} from '../../styles/atoms';
import { Channel, EditChannel, Member } from '../../api/channels';
import { useForm } from 'react-hook-form';
import { AppError } from '../../api/error';
import DiceSelect, { DiceOption } from '../molecules/DiceSelect';
import { useDispatch, useSelector } from '../../store';
import { PanelTitle } from '../atoms/PanelTitle';
import Panel from '../molecules/Panel';
import { RenderError } from '../molecules/RenderError';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { channelNameValidation, channelTopicValidation } from '../../validators';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import TextArea from '../atoms/TextArea';
import Button from '../atoms/Button';
import { post } from '../../api/request';
import Text from '../atoms/Text';
import Select, { ValueType } from 'react-select';
import { Set } from 'immutable';
import { usePane } from '../../hooks/usePane';
import Dialog from '../molecules/Dialog';
import { useHistory } from 'react-router-dom';
import { chatPath } from '../../utils/path';
import { showFlash } from '../../actions/flash';
import ExportButton from './ExportButton';

interface Props {
  channel: Channel;
  dismiss: () => void;
}

const buttons = css`
  display: flex;
`;

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
  const [deleteDialog, setDeleteDialog] = useState(false);
  const history = useHistory();
  const dispatch = useDispatch();
  const pane = usePane();
  const members = useSelector((state) => state.chatPane[pane]?.members) || [];
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
  const openDeleteDialog = () => setDeleteDialog(true);
  const dismissDeleteDialog = () => setDeleteDialog(false);

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
  const deleteChannel = async () => {
    const result = await post('/channels/delete', {}, { id: channelId });
    if (result.isOk) {
      history.push(chatPath(channel.spaceId));
    } else {
      dispatch(showFlash('ERROR', '删除频道失败'));
    }
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
        <div css={[mY(2), buttons]}>
          <ExportButton css={[widthFull, mR(2)]} channel={channel} />
          <Button css={[textSm]} data-variant="danger" disabled={submitting} onClick={openDeleteDialog} type="button">
            删除
          </Button>
        </div>
        <div css={[buttons, mT(4)]}>
          <Button css={[widthFull]} data-variant="primary" disabled={submitting} type="submit">
            提交修改
          </Button>
        </div>
      </form>
      {deleteDialog && (
        <Dialog title="删除频道" confirmText="删除" dismiss={dismissDeleteDialog} confirm={deleteChannel}>
          <Text>真的要删除频道「{channel.name}」吗？此操作不可撤销！</Text>
        </Dialog>
      )}
    </Panel>
  );
}

export default ManageChannel;
