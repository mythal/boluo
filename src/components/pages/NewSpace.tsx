import * as React from 'react';
import { useState } from 'react';
import Title from '../atoms/Title';
import { useTitle } from '../../hooks';
import { AppError } from '../../api/error';
import { useForm } from 'react-hook-form';
import { CreateSpace } from '../../api/spaces';
import { alignRight, gridColumn, largeInput, md, mT, mY, spacingN, textLg } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import { css } from '@emotion/core';
import { post } from '../../api/request';
import Button from '../atoms/Button';
import { useHistory } from 'react-router-dom';
import { useDispatch } from '../Provider';
import { JoinedSpace } from '../../actions/profile';
import implosion from '../../assets/icons/implosion.svg';
import Icon from '../atoms/Icon';
import { channelNameValidation, descriptionValidation, spaceNameValidation } from '../../validators';
import { RenderError } from '../molecules/RenderError';
import DiceSelect from '../molecules/DiceSelect';

export const fieldsLayout = css`
  display: grid;
  gap: ${spacingN(2)};
  grid-template-columns: repeat(4, 1fr);
`;

function NewSpace() {
  useTitle('新建位面');
  const [creationError, setCreationError] = useState<AppError | null>(null);
  const { register, handleSubmit, errors } = useForm<CreateSpace>();
  const history = useHistory();
  const dispatch = useDispatch();

  const onSubmit = async (data: CreateSpace) => {
    const result = await post('/spaces/create', data);
    if (result.isOk) {
      const { space, member } = result.value;
      dispatch<JoinedSpace>({ type: 'JOINED_SPACE', space, member });
      history.push(`/space/${space.id}`);
    } else {
      setCreationError(result.value);
    }
  };
  return (
    <>
      <Title>
        <Icon sprite={implosion} /> 开辟新的位面
      </Title>
      {creationError && <RenderError error={creationError} variant="component" />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[md(fieldsLayout)]}>
          <div css={[mY(2), gridColumn(1, 3)]}>
            <Label htmlFor="name">位面名</Label>
            <Input css={largeInput} id="name" name="name" ref={register(spaceNameValidation())} />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </div>
          <div css={mY(2)}>
            <Label htmlFor="defaultDiceType">默认骰子</Label>
            <DiceSelect ref={register({ required: true })} />
            <HelpText>
              当输入 <code>1d20</code> 的时候可以简化成 <code>1d</code>。
            </HelpText>
          </div>
          <div css={[mY(2)]}>
            <Label htmlFor="firstChannelName">初始频道名</Label>
            <Input
              css={largeInput}
              defaultValue="综合"
              id="firstChannelName"
              name="firstChannelName"
              ref={register(channelNameValidation)}
            />
            <HelpText>频道中可以发送各种消息。</HelpText>
          </div>
          <div css={[mY(2), gridColumn(1, -1)]}>
            <Label htmlFor="description">简介</Label>
            <Input css={largeInput} id="description" name="description" ref={register(descriptionValidation)} />
            <HelpText>（选填）简要描述一下这个位面。</HelpText>
          </div>
        </div>
        <div css={[alignRight]}>
          <Button css={[mT(4), textLg]} type="submit" data-variant="primary">
            创建位面
          </Button>
        </div>
      </form>
    </>
  );
}

export default NewSpace;
