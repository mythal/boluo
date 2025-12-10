import { css } from '@emotion/react';
import { useState } from 'react';
import { type RegisterOptions as ValidationRules, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { type AppError, errorText } from '../../api/error';
import { post } from '../../api/request';
import { type RegisterData } from '../../api/users';
import SignUpIcon from '../../assets/icons/sign-up.svg';
import Icon from '../../components/atoms/Icon';
import { useTitle } from '../../hooks/useTitle';
import {
  alignRight,
  flex,
  largeInput,
  link,
  listItemSquare,
  md,
  mL,
  mY,
  sm,
  spacingN,
  textLg,
  textSm,
  textXl,
} from '../../styles/atoms';
import {
  emailValidation,
  nicknameValidation,
  passwordValidation,
  usernameValidation,
} from '../../validators';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import { HelpText } from '../atoms/HelpText';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import Title from '../atoms/Title';
import InformationBar from '../molecules/InformationBar';

interface FormData extends RegisterData {
  passwordRepeat: string;
}

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

const footerStyle = css`
  ${[sm(flex)]};
  justify-content: space-between;
`;

const noticeStyle = css`
  padding: 0;
  ${[textSm, listItemSquare]};
`;

function SignUp() {
  useTitle('注册账号');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();
  const [submitting, setSubmitting] = useState(false);
  const [registerError, setRegisterError] = useState<AppError | null>(null);
  const navigate = useNavigate();
  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    const result = await post('/users/register', data);
    if (result.isOk) {
      navigate('/login', { replace: true });
    } else {
      setRegisterError(result.value);
    }
  };
  const passwordRepeatValidation = {
    ...passwordValidation,
    validate: (value: string) => value === watch('password') || '两次输入的密码不相同',
  } satisfies ValidationRules;
  return (
    <>
      <Title>注册账号</Title>
      {registerError && (
        <InformationBar variant="ERROR">
          <>{errorText(registerError).description}</>
        </InformationBar>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={formGrid}>
          <div css={[mY(2)]}>
            <Label htmlFor="email">邮箱</Label>
            <Input
              css={largeInput}
              type="email"
              id="email"
              {...register('email', emailValidation)}
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </div>
          <div css={[mY(2)]}>
            <Label htmlFor="username">用户名</Label>
            <Input
              css={largeInput}
              id="username"
              autoComplete="username"
              {...register('username', usernameValidation)}
            />
            <HelpText>英文、数字和下划线。至少3个字符。</HelpText>
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
          </div>
          <div css={[mY(2)]}>
            <Label htmlFor="nickname">昵称</Label>
            <Input css={largeInput} id="nickname" {...register('nickname', nicknameValidation)} />
            {errors.nickname && <ErrorMessage>{errors.nickname.message}</ErrorMessage>}
          </div>
          <div css={mY(2)}>
            <Label htmlFor="password">密码</Label>
            <Input
              css={largeInput}
              type="password"
              id="password"
              autoComplete="new-password"
              {...register('password', passwordValidation)}
            />
            <HelpText>至少8个字符，请勿过于简单。</HelpText>
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </div>
          <div css={mY(2)}>
            <Label htmlFor="passwordRepeat">重复一遍密码</Label>
            <Input
              css={largeInput}
              type="password"
              id="passwordRepeat"
              autoComplete="new-password"
              {...register('passwordRepeat', passwordRepeatValidation)}
            />
            {errors.passwordRepeat && <ErrorMessage>{errors.passwordRepeat.message}</ErrorMessage>}
          </div>
        </div>
        <div css={footerStyle}>
          <div>
            <h2 css={[textXl]}>须知</h2>
            <ul css={noticeStyle}>
              <li>本站可用于举办桌面 RPG 游戏聚会，以及玩家间不限主题的闲聊。</li>
              <li>出于保护网站的目的，有风险的内容请不要设为公开访问。</li>
              <li>用户在本站产生的内容，版权归用户本人所有。</li>
              <li>
                <a css={link} href="https://github.com/mythal/boluo">
                  本站的源代码
                </a>
                在 GNU General Public License v3.0 下发布。
              </li>
            </ul>
          </div>
          <div css={[alignRight]}>
            <Button
              css={[mL(4), textLg]}
              disabled={submitting}
              data-variant="primary"
              type="submit"
            >
              <Icon icon={SignUpIcon} loading={submitting} />
              注册账号
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

export default SignUp;
