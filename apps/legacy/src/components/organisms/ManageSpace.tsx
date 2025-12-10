import { css } from '@emotion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { type Channel } from '../../api/channels';
import { type AppError } from '../../api/error';
import { post } from '../../api/request';
import {
  type EditSpace,
  type Space,
  type SpaceMember,
  type SpaceMemberWithUser,
} from '../../api/spaces';
import EarthCrack from '../../assets/icons/earth-crack.svg';
import { useDispatch } from '../../store';
import {
  alignRight,
  breakpoint,
  flexCol,
  largeInput,
  mediaQuery,
  mY,
  pB,
  spacingN,
  widthFull,
} from '../../styles/atoms';
import { type Id } from '../../utils/id';
import { descriptionValidation, required, spaceNameValidation } from '../../validators';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import Icon from '../atoms/Icon';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import { PanelTitle } from '../atoms/PanelTitle';
import Text from '../atoms/Text';
import TextArea from '../atoms/TextArea';
import Dialog from '../molecules/Dialog';
import DiceSelect, { type DiceOption } from '../molecules/DiceSelect';
import Panel from '../molecules/Panel';
import { RenderError } from '../molecules/RenderError';

interface Props {
  space: Space;
  channels: Channel[];
  members: Record<Id, SpaceMemberWithUser | undefined>;
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditSpace>();
  const [editError, setEditError] = useState<AppError | null>(null);
  const [defaultDice, setDefaultDice] = useState<DiceOption | null | undefined>(undefined);
  const [deleteDialog, showDeleteDialog] = useState(false);
  const navigate = useNavigate();
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
    navigate('/');
  };

  return (
    <Panel css={panelStyle} dismiss={dismiss} mask>
      <PanelTitle>管理位面</PanelTitle>
      {editError && <RenderError error={editError} variant="component" />}
      <form onSubmit={handleSubmit(onSubmit)}>
        <input readOnly value={space.id} {...register('spaceId', { required })} hidden />
        <div>
          <Label htmlFor="name">位面名</Label>
          <Input
            css={largeInput}
            id="name"
            defaultValue={space.name}
            {...register('name', spaceNameValidation)}
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
            {...register('description', descriptionValidation)}
          />
          <HelpText>简要描述一下这个位面。</HelpText>
          {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
        </div>
        <div css={[mY(2)]}>
          <Label>
            <input
              type="checkbox"
              defaultChecked={space.explorable}
              id="explorable"
              {...register('explorable')}
            />{' '}
            在「探索位面」中列出
          </Label>
        </div>
        <div css={[mY(2)]}>
          <Label css={pB(0)}>
            <input
              type="checkbox"
              defaultChecked={space.isPublic}
              {...register('isPublic')}
              id="isPublic"
            />{' '}
            公开位面
          </Label>
          <HelpText>非公开位面只能通过邀请链接来加入</HelpText>
        </div>
        <div css={[mY(2)]}>
          <Label>
            <input
              type="checkbox"
              defaultChecked={space.allowSpectator}
              id="allowSpectator"
              {...register('allowSpectator')}
            />{' '}
            允许旁观者
          </Label>
        </div>
        <div css={[mY(4), alignRight]}>
          <Button
            data-variant="danger"
            disabled={submitting}
            type="button"
            onClick={() => showDeleteDialog(true)}
          >
            <Icon icon={EarthCrack} /> 摧毁位面
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
