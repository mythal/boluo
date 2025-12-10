import { css } from '@emotion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { type JoinedSpace } from '../../actions';
import { type AppError } from '../../api/error';
import { post } from '../../api/request';
import { type CreateSpace } from '../../api/spaces';
import Implosion from '../../assets/icons/implosion.svg';
import NightSky from '../../assets/icons/night-sky.svg';
import { useTitle } from '../../hooks/useTitle';
import { useDispatch } from '../../store';
import {
  alignRight,
  gridColumn,
  largeInput,
  md,
  mT,
  mY,
  spacingN,
  textLg,
} from '../../styles/atoms';
import { encodeUuid } from '../../utils/id';
import {
  channelNameValidation,
  descriptionValidation,
  spaceNameValidation,
} from '../../validators';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import Icon from '../atoms/Icon';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import TextArea from '../atoms/TextArea';
import Title from '../atoms/Title';
import DiceSelect, { type DiceOption } from '../molecules/DiceSelect';
import { RenderError } from '../molecules/RenderError';

export const fieldsLayout = css`
  display: grid;
  gap: ${spacingN(2)};
  grid-template-columns: repeat(4, 1fr);
`;

function NewSpace() {
  useTitle('新建位面');
  const [creationError, setCreationError] = useState<AppError | null>(null);
  const [defaultDice, setDefaultDice] = useState<DiceOption | null | undefined>(undefined);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSpace>();
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onSubmit = async (data: CreateSpace) => {
    data.defaultDiceType = defaultDice?.value;
    setSubmitting(true);
    const result = await post('/spaces/create', data);
    setSubmitting(false);
    if (result.isOk) {
      const { space, member } = result.value;
      const action: JoinedSpace = { type: 'JOINED_SPACE', space, member };
      dispatch<JoinedSpace>(action);
      navigate(`/space/${encodeUuid(space.id)}`);
    } else {
      setCreationError(result.value);
    }
  };
  return (
    <>
      <Title>
        <Icon icon={Implosion} /> 开辟新的位面
      </Title>
      {creationError && <RenderError error={creationError} variant="component" />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[md(fieldsLayout)]}>
          <div css={[mY(2), gridColumn(1, 3)]}>
            <Label htmlFor="name">位面名</Label>
            <Input css={largeInput} id="name" {...register('name', spaceNameValidation)} />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </div>
          <div css={mY(2)}>
            <Label htmlFor="defaultDiceType">默认骰子</Label>

            <DiceSelect
              id="defaultDiceType"
              name="defaultDiceType"
              defaultDiceType="d20"
              value={defaultDice}
              onChange={setDefaultDice}
            />
            {/*<Controller name="defaultDiceType" as={DiceSelect} control={control} rules={{ required }}/>*/}
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
              {...register('firstChannelName', channelNameValidation())}
            />
            <HelpText>频道中可以发送各种消息。</HelpText>
          </div>
          <div css={[mY(2), gridColumn(1, -1)]}>
            <Label htmlFor="description">简介</Label>
            <TextArea
              placeholder="（选填）简要描述一下这个位面。"
              id="description"
              {...register('description', descriptionValidation)}
            />
          </div>
        </div>
        <div css={[alignRight]}>
          <Button css={[mT(4), textLg]} type="submit" data-variant="primary" disabled={submitting}>
            <Icon icon={NightSky} loading={submitting} />
            创建位面
          </Button>
        </div>
      </form>
    </>
  );
}

export default NewSpace;
