import * as React from 'react';
import { useState } from 'react';
import { EditSpace, Space, SpaceMember } from '../../api/spaces';
import { Channel } from '../../api/channels';
import { alignRight, breakpoint, flexCol, largeInput, mediaQuery, mY, spacingN, widthFull } from '../../styles/atoms';
import { PanelTitle } from '../atoms/PanelTitle';
import { css } from '@emotion/core';
import Panel from '../molecules/Panel';
import { useForm } from 'react-hook-form';
import { AppError } from '../../api/error';
import { RenderError } from '../molecules/RenderError';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { descriptionValidation, required, spaceNameValidation } from '../../validators';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import DiceSelect, { DiceOption } from '../molecules/DiceSelect';
import TextArea from '../atoms/TextArea';
import Button from '../atoms/Button';
import { post } from '../../api/request';
import { useDispatch } from '../../store';
import { useHistory } from 'react-router-dom';
import deleteSpaceIcon from '../../assets/icons/earth-crack.svg';
import Text from '../atoms/Text';
import Icon from '../atoms/Icon';
import Dialog from '../molecules/Dialog';

interface Props {
  space: Space;
  channels: Channel[];
  members: SpaceMember[];
  my: SpaceMember;
  dismiss: () => void;
}

const panelStyle = css`
  width: ${spacingN(64)};
  ${mediaQuery(breakpoint.md)} {
    width: ${spacingN(80)};
  }
`;

function ManageSpace({ space, my, dismiss }: Props) {
  const { register, handleSubmit, errors } = useForm<EditSpace>();
  const [editError, setEditError] = useState<AppError | null>(null);
  const [defaultDice, setDefaultDice] = useState<DiceOption | undefined>(undefined);
  const [deleteDialog, showDeleteDialog] = useState(false);
  const history = useHistory();
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  if (space.ownerId !== my.userId && !my.isAdmin) {
    return <PanelTitle>没有权限管理位面</PanelTitle>;
  }
  const onSubmit = async (payload: EditSpace) => {
    setSubmitting(true);
    payload.defaultDiceType = defaultDice?.value;
    const result = await post('/spaces/edit', payload);
    setSubmitting(false);
    if (!result.isOk) {
      setEditError(result.value);
      return;
    }
    dispatch({ type: 'SPACE_EDITED', space: result.value });
    dismiss();
  };

  const deleteSpace = async () => {
    setSubmitting(true);
    const result = await post('/spaces/delete', {}, { id: space.id });
    if (!result.isOk) {
      setEditError(result.value);
      return;
    }
    dispatch({ type: 'SPACE_DELETED', spaceId: space.id });
    history.push('/');
  };

  return (
    <Panel css={panelStyle} dismiss={dismiss} mask>
      <PanelTitle>管理位面</PanelTitle>
      {editError && <RenderError error={editError} variant="component" />}
      <form onSubmit={handleSubmit(onSubmit)}>
        <input readOnly value={space.id} name="spaceId" ref={register({ required })} hidden />
        <div>
          <Label htmlFor="name">位面名</Label>
          <Input
            css={largeInput}
            id="name"
            name="name"
            defaultValue={space.name}
            ref={register(spaceNameValidation(space.name))}
          />
          {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
        </div>
        <div>
          <Label htmlFor="defaultDiceType">默认骰子</Label>
          <DiceSelect
            id="defaultDiceType"
            name="defaultDiceType"
            defaultDiceType={space.defaultDiceType}
            value={defaultDice}
            onChange={setDefaultDice}
          />
          <HelpText>
            当输入 <code>1d20</code> 的时候可以简化成 <code>1d</code>。
          </HelpText>
        </div>
        <div css={[mY(2), flexCol]}>
          <Label htmlFor="description">简介</Label>
          <TextArea
            id="description"
            defaultValue={space.description}
            name="description"
            ref={register(descriptionValidation)}
          />
          <HelpText>简要描述一下这个位面。</HelpText>
          {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
        </div>
        <div css={[mY(2)]}>
          <Label>
            <input type="checkbox" defaultChecked={space.explorable} ref={register} name="explorable" id="explorable" />{' '}
            在「探索位面」中列出
          </Label>
        </div>
        <div css={[mY(4), alignRight]}>
          <Button data-variant="danger" disabled={submitting} type="button" onClick={() => showDeleteDialog(true)}>
            <Icon sprite={deleteSpaceIcon} /> 摧毁位面
          </Button>
        </div>
        <Button data-variant="primary" disabled={submitting} css={widthFull} type="submit">
          提交修改
        </Button>
      </form>
      {deleteDialog && (
        <Dialog
          title="摧毁位面"
          confirmText="我确定，要摧毁"
          dismiss={() => showDeleteDialog(false)}
          confirm={deleteSpace}
          confirmButtonVariant="danger"
          mask
        >
          <Text>真的要毁灭位面「{space.name}」吗？此操作不可撤销。</Text>
        </Dialog>
      )}
    </Panel>
  );
}

export default ManageSpace;
