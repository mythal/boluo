import { type ApiError } from '@boluo/api';
import { post } from '@boluo/api-browser';
import { explainError } from '@boluo/locale/errors';
import * as validators from '@boluo/common/validations';
import UserPlus from '@boluo/icons/UserPlus';
import { type FC, type MouseEventHandler, useCallback, useId, useState } from 'react';
import {
  type FieldError,
  FormProvider,
  type SubmitHandler,
  useForm,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import { FormattedMessage, type IntlShape, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextInput } from '@boluo/ui/TextInput';
import * as classes from '@boluo/ui/classes';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { paneHref } from '../href';
import { ButtonInline } from '@boluo/ui/ButtonInline';

interface Schema {
  username: string;
  email: string;
  nickname: string;
  password: string;
}

const FormErrorDisplay: FC<{ error: ApiError; intl: IntlShape }> = ({ error, intl }) => {
  return <ErrorMessageBox>{explainError(intl, error)}</ErrorMessageBox>;
};

const FieldErrorMessage: FC<{ error?: FieldError }> = ({ error }) => {
  if (!error) {
    return null;
  }
  return <div className="mt-1 text-sm">{error.message}</div>;
};

const UsernameField = () => {
  const intl = useIntl();
  const id = useId();
  const {
    register,
    formState: {
      errors: { username: error },
    },
  } = useFormContext<Schema>();
  return (
    <div>
      <label htmlFor={id} className="block w-full py-1">
        <FormattedMessage defaultMessage="Username" />
      </label>
      <TextInput
        className="w-full"
        id={id}
        autoComplete="username"
        autoCapitalize="off"
        autoCorrect="off"
        variant={error ? 'error' : 'normal'}
        {...register('username', validators.username(intl))}
      />
      <FieldErrorMessage error={error} />
    </div>
  );
};

const EmailField = () => {
  const intl = useIntl();
  const id = useId();
  const {
    register,
    formState: {
      errors: { email: error },
    },
  } = useFormContext<Schema>();
  return (
    <div>
      <label htmlFor={id} className="block w-full py-1">
        <FormattedMessage defaultMessage="Email" />
      </label>
      <TextInput
        className="w-full"
        type="email"
        id={id}
        autoComplete="email"
        autoCapitalize="off"
        autoCorrect="off"
        variant={error ? 'error' : 'normal'}
        {...register('email', validators.email(intl))}
      />
      <FieldErrorMessage error={error} />
    </div>
  );
};

const NicknameField = () => {
  const intl = useIntl();
  const id = useId();
  const {
    register,
    formState: {
      errors: { nickname: error },
    },
  } = useFormContext<Schema>();
  return (
    <div>
      <label htmlFor={id} className="block w-full py-1">
        <FormattedMessage defaultMessage="Nickname" />
      </label>
      <TextInput
        className="w-full"
        id={id}
        autoComplete="nickname"
        variant={error ? 'error' : 'normal'}
        {...register('nickname', validators.nickname(intl))}
      />
      <FieldErrorMessage error={error} />
    </div>
  );
};

const PasswordField = () => {
  const intl = useIntl();
  const id = useId();
  const [show, setShow] = useState(false);
  const {
    register,
    formState: {
      errors: { password: error },
    },
  } = useFormContext<Schema>();
  return (
    <div>
      <div className="flex items-center py-1">
        <label htmlFor={id} className="grow">
          <FormattedMessage defaultMessage="Password" />
        </label>
        <ButtonInline type="button" onClick={() => setShow((next) => !next)}>
          {show ? (
            <FormattedMessage defaultMessage="Hide" />
          ) : (
            <FormattedMessage defaultMessage="Show" />
          )}
        </ButtonInline>
      </div>
      <TextInput
        className="w-full"
        type={show ? 'text' : 'password'}
        id={id}
        autoComplete="new-password"
        variant={error ? 'error' : 'normal'}
        {...register('password', validators.password(intl))}
      />
      <FieldErrorMessage error={error} />
    </div>
  );
};

const FormContent: FC<{ error: ApiError | null }> = ({ error }) => {
  const intl = useIntl();
  const { isSubmitting, isValid } = useFormState<Schema>();
  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl">
        <FormattedMessage defaultMessage="Sign Up" />
      </div>
      <UsernameField />
      <EmailField />
      <NicknameField />
      <PasswordField />
      {error && (
        <div className="text-state-danger-text my-1">
          <FormErrorDisplay error={error} intl={intl} />
        </div>
      )}
      <div className="mt-2 flex justify-end">
        <Button variant="primary" type="submit" disabled={!isValid || isSubmitting}>
          <FormattedMessage defaultMessage="Sign Up" />
        </Button>
      </div>
    </div>
  );
};

export const PaneSignUp: FC = () => {
  const replacePane = usePaneReplace();
  const methods = useForm<Schema>({ mode: 'onChange' });
  const [error, setError] = useState<ApiError | null>(null);
  const loginPaneHref = paneHref({ type: 'LOGIN' });

  const onSubmit: SubmitHandler<Schema> = useCallback(
    ({ username, email, nickname, password }) => {
      void (async () => {
        const result = await post('/users/register', null, {
          username,
          email,
          nickname,
          password,
        });
        if (result.isErr) {
          setError(result.err);
          return;
        }
        setError(null);
        replacePane({ type: 'LOGIN' }, (pane) => pane.type === 'SIGN_UP');
      })();
    },
    [replacePane],
  );

  const handleOpenLogin: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (event) => {
      event.preventDefault();
      replacePane({ type: 'LOGIN' }, (pane) => pane.type === 'SIGN_UP');
    },
    [replacePane],
  );

  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<UserPlus />}>
          <FormattedMessage defaultMessage="Sign Up" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane max-w-lg">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
            <FormContent error={error} />
          </form>
        </FormProvider>
        <div className="mt-4 text-right">
          <a href={loginPaneHref} className={classes.link} onClick={handleOpenLogin}>
            <FormattedMessage defaultMessage="Already have an account? Log in" />
          </a>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneSignUp;
