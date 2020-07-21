import * as React from 'react';
import BasePage from './templates/BasePage';
import Title from './atoms/Title';
import { useTitle } from '../hooks';
import { css } from '@emotion/core';
import { alignRight, block, largeInput, md, mT, mY, pY, sm, spacingN, textLg } from '../styles/atoms';
import Input from './atoms/Input';
import Button from './atoms/Button';
import { useForm, ValidationRules } from 'react-hook-form';
import { get, post } from '../api/request';
import { useState } from 'react';
import { AppError, errorText } from '../api/error';
import InformationBar from './molecules/InformationBar';
import { useHistory } from 'react-router-dom';
import { RegisterData } from '../api/users';
import { ErrorMessage } from './atoms/ErrorMessage';

interface FormData extends RegisterData {
  passwordRepeat: string;
}

const labelStyle = css`
  ${pY(2)};
  ${block}
`;

const required = '必须填写这个字段';

const emailValidation: ValidationRules = {
  required,
  pattern: {
    // https://emailregex.com/
    value: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    message: 'E-mail 地址格式不正确，请检查',
  },
  validate: async (email) => {
    const result = await get('/users/check_email', { email });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个 E-mail 地址已经存在，是否已经注册了？';
    }
    return true;
  },
};

const nicknameValidation: ValidationRules = {
  required,
  minLength: {
    value: 2,
    message: '昵称至少需要两个字符',
  },
  validate: (nickname: string) => {
    const striped = nickname.replace(/\s/g, '');
    if (striped.length === 0) {
      return '昵称不能为空';
    } else if (striped.length < 2) {
      return '昵称至少需要两个字符';
    }
  },
  maxLength: {
    value: 32,
    message: '昵称至少最多只能有32字符',
  },
};

const usernameValidation: ValidationRules = {
  required,
  pattern: {
    value: /^[\w_\d]+$/,
    message: '名字只允许包含字母、下划线或数字',
  },
  minLength: {
    value: 3,
    message: '用户名至少需要3个字符',
  },
  maxLength: {
    value: 32,
    message: '用户名最多只能有32个字符',
  },
  validate: async (username) => {
    const result = await get('/users/check_username', { username });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.value) {
      return '这个用户名已经存在';
    }
    return true;
  },
};

const passwordValidation: ValidationRules = {
  required,
  minLength: {
    value: 8,
    message: '密码至少需要有 8 个字符',
  },
  maxLength: {
    value: 2048,
    message: '密码太长了',
  },
};

const formGrid = [
  sm(css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-column-gap: ${spacingN(2)};
  `),
  md(css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-column-gap: ${spacingN(2)};
  `),
];

function SignUp() {
  useTitle('注册账号');
  const { register, handleSubmit, watch, errors } = useForm<FormData>();
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<AppError | null>(null);
  const history = useHistory();
  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const result = await post('/users/register', data);
    if (result.isOk) {
      history.replace('/login');
    } else {
      setRegisterError(result.value);
    }
  };
  const passwordRepeatValidation: ValidationRules = {
    ...passwordValidation,
    validate: (value: string) => value === watch('password') || '两次输入的密码不相同',
  };
  return (
    <BasePage>
      <Title>注册账号</Title>
      {registerError && <InformationBar variant="ERROR">{errorText(registerError)}</InformationBar>}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={formGrid}>
          <div css={[mY(2)]}>
            <label css={labelStyle} htmlFor="email">
              邮箱
            </label>
            <Input css={largeInput} type="email" id="email" name="email" ref={register(emailValidation)} />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </div>
          <div css={[mY(2)]}>
            <label css={labelStyle} htmlFor="nickname">
              昵称
            </label>
            <Input css={largeInput} id="nickname" name="nickname" ref={register(nicknameValidation)} />
            {errors.nickname && <ErrorMessage>{errors.nickname.message}</ErrorMessage>}
          </div>
          <div css={[mY(2)]}>
            <label css={labelStyle} htmlFor="username">
              用户名
            </label>
            <Input css={largeInput} id="username" name="username" ref={register(usernameValidation)} />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>

          <div css={mY(2)}>
            <label css={labelStyle} htmlFor="password">
              密码
            </label>
            <Input css={largeInput} type="password" id="password" name="password" ref={register(passwordValidation)} />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
          <div css={mY(2)}>
            <label css={labelStyle} htmlFor="passwordRepeat">
              重复密码
            </label>
            <Input
              css={largeInput}
              type="password"
              id="passwordRepeat"
              name="passwordRepeat"
              ref={register(passwordRepeatValidation)}
            />
            {errors.passwordRepeat && <ErrorMessage>{errors.passwordRepeat.message}</ErrorMessage>}
          </div>
        </div>
        <div css={alignRight}>
          <Button css={[mT(4), textLg]} disabled={submitting} data-variant="primary" type="submit">
            注册
          </Button>
        </div>
      </form>
    </BasePage>
  );
}

export default SignUp;
