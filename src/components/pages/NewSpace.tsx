import * as React from 'react';
import Title from '../atoms/Title';
import { useTitle } from '../../hooks';
import { useState } from 'react';
import { AppError, errorText } from '../../api/error';
import InformationBar from '../molecules/InformationBar';
import { useForm, ValidationRules } from 'react-hook-form';
import { CreateSpace } from '../../api/spaces';
import {
  alignRight,
  controlHeight,
  gridColumn,
  largeInput,
  md,
  mT,
  mY,
  p,
  spacingN,
  textLg,
  textXl,
  widthFull,
} from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import styled from '@emotion/styled';
import { css } from '@emotion/core';
import { get, post } from '../../api/request';
import Button from '../atoms/Button';
import { useHistory } from 'react-router-dom';
import { useDispatch } from '../Provider';
import { JoinedSpace } from '../../actions/profile';
import implosion from '../../assets/icons/implosion.svg';
import Icon from '../atoms/Icon';

const spaceNameValidation: ValidationRules = {
  required: '必须填写位面名',
  maxLength: {
    value: 32,
    message: '位面名不可超过32字符',
  },
  validate: async (name: string) => {
    const striped = name.replace(/\s/g, '');
    if (striped.length === 0) {
      return '位面名不能为空';
    } else if (striped.length < 2) {
      return '位面名至少需要两个字符';
    }
    const result = await get('/spaces/check_name', { name });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个位面名已经存在';
    }
    return true;
  },
};

export const channelNameValidation: ValidationRules = {
  required: '必须填写频道名',
  maxLength: {
    value: 32,
    message: '频道名不可超过32字符',
  },
  validate: async (name: string) => {
    const striped = name.replace(/\s/g, '');
    if (striped.length === 0) {
      return '位面名不能为空';
    } else if (striped.length < 2) {
      return '位面名至少需要两个字符';
    }
  },
};

const descriptionValidation: ValidationRules = {
  maxLength: {
    value: 128,
    message: '简介最多128字符',
  },
};

export const Select = styled.select`
  ${widthFull};
  ${textXl};
  ${controlHeight};
  ${p(1)};
  filter: invert();
`;

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
      {creationError && <InformationBar variant="ERROR">{errorText(creationError)}</InformationBar>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[md(fieldsLayout)]}>
          <div css={[mY(2), gridColumn(1, 3)]}>
            <Label htmlFor="name">位面名</Label>
            <Input css={largeInput} id="name" name="name" ref={register(spaceNameValidation)} />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
          </div>
          <div css={mY(2)}>
            <Label htmlFor="password">加入密码</Label>
            <Input css={largeInput} id="password" name="password" ref={register()} />
            <HelpText>留空则不设密码。密码功能暂时未启用，等待后续更新。</HelpText>
          </div>
          <div css={mY(2)}>
            <Label htmlFor="defaultDiceType">默认骰子</Label>
            <Select defaultValue="d20" id="defaultDiceType" name="defaultDiceType" ref={register({ required: true })}>
              <option value="d20">D20</option>
              <option value="d100">D100</option>
              <option value="d6">D6</option>
            </Select>
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
          <div css={[mY(2), gridColumn(2, -1)]}>
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
