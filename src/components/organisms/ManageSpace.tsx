import * as React from 'react';
import { EditSpace, Space, SpaceMember } from '@/api/spaces';
import { Channel } from '@/api/channels';
import { breakpoint, flexCol, largeInput, mediaQuery, mY, spacingN, widthFull } from '@/styles/atoms';
import { PanelTitle } from '../atoms/PanelTitle';
import { css } from '@emotion/core';
import Panel from '../molecules/Panel';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { AppError } from '@/api/error';
import { RenderError } from '../molecules/RenderError';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { descriptionValidation, required, spaceNameValidation } from '@/validators';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import DiceSelect, { DiceOption } from '../molecules/DiceSelect';
import TextArea from '../atoms/TextArea';
import Button from '../atoms/Button';
import { post } from '@/api/request';
import { useDispatch } from '@/store';

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

export const dictOptions = [
  { value: 'd20', label: 'D20' },
  { value: 'd100', label: 'D100' },
  { value: 'd6', label: 'D6' },
];

function ManageSpace({ space, channels, members, my, dismiss }: Props) {
  const { register, handleSubmit, errors } = useForm<EditSpace>();
  const [editError, setEditError] = useState<AppError | null>(null);
  const [defaultDice, setDefaultDice] = useState<DiceOption | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const dispatch = useDispatch();
  if (space.ownerId !== my.userId && !my.isAdmin) {
    return <PanelTitle>没有权限管理位面</PanelTitle>;
  }
  const onSubmit = async (payload: EditSpace) => {
    setEditing(true);
    payload.defaultDiceType = defaultDice?.value;
    const result = await post('/spaces/edit', payload);
    setEditing(false);
    if (!result.isOk) {
      setEditError(result.value);
      return;
    }
    dispatch({ type: 'SPACE_EDITED', space: result.value });
    dismiss();
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
        </div>
        <Button data-variant="primary" disabled={editing} css={widthFull} type="submit">
          提交修改
        </Button>
      </form>
    </Panel>
  );
}

export default ManageSpace;
