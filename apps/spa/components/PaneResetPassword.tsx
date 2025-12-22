import { post } from '@boluo/api-browser';
import Key from '@boluo/icons/Key';
import { type FC, type MouseEventHandler, useCallback, useId, useState } from 'react';
import { type SubmitHandler, type FieldError, useForm } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import * as validators from '@boluo/common/validations';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import { TextInput } from '@boluo/ui/TextInput';
import * as classes from '@boluo/ui/classes';
import { PaneBox } from './PaneBox';
import { PaneHeaderBox } from './PaneHeaderBox';
import { usePaneReplace } from '../hooks/usePaneReplace';
import { paneHref } from '../href';

type PageState = 'FORM' | 'SUCCESS' | 'NOT_FOUND' | 'UNKNOWN_ERROR';

interface FormSchema {
  email: string;
}

const FieldErrorMessage: FC<{ error?: FieldError }> = ({ error }) => {
  if (!error) {
    return null;
  }

  return <div className="mt-1 text-sm">{error.message}</div>;
};

export const PaneResetPassword: FC = () => {
  const intl = useIntl();
  const [pageState, setPageState] = useState<PageState>('FORM');
  const replacePane = usePaneReplace();
  const loginPaneHref = paneHref({ type: 'LOGIN' });
  const {
    handleSubmit,
    register,
    formState: { isSubmitting, errors },
  } = useForm<FormSchema>();
  const fieldId = useId();

  const onSubmit: SubmitHandler<FormSchema> = useCallback(
    ({ email }) => {
      void (async () => {
        const result = await post('/users/reset_password', null, { email, lang: intl.locale });
        if (result.isErr) {
          if (result.err.code === 'NOT_FOUND') {
            setPageState('NOT_FOUND');
            return;
          }
          console.warn(result.err);
          setPageState('UNKNOWN_ERROR');
          return;
        }
        setPageState('SUCCESS');
      })();
    },
    [intl.locale],
  );

  const handleOpenLogin: MouseEventHandler<HTMLAnchorElement> = useCallback(
    (event) => {
      event.preventDefault();
      replacePane({ type: 'LOGIN' }, (pane) => pane.type === 'RESET_PASSWORD');
    },
    [replacePane],
  );

  const handleRetry = useCallback(() => setPageState('FORM'), []);
  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={<Key />}>
          <FormattedMessage defaultMessage="Reset Password" />
        </PaneHeaderBox>
      }
    >
      <div className="p-pane max-w-lg">
        {pageState === 'FORM' ? (
          <form
            onSubmit={(event) => {
              void handleFormSubmit(event);
            }}
            className="flex flex-col gap-4 pt-2"
          >
            <div>
              <label htmlFor={fieldId} className="block py-1">
                <FormattedMessage defaultMessage="Email" />
              </label>
              <TextInput
                id={fieldId}
                type="email"
                autoComplete="email"
                className="w-full"
                autoCapitalize="off"
                autoCorrect="off"
                variant={errors.email ? 'error' : 'normal'}
                {...register('email', { ...validators.required(intl) })}
              />
              <FieldErrorMessage error={errors.email} />
            </div>

            <div className="text-right">
              <Button type="submit" disabled={isSubmitting}>
                <FormattedMessage defaultMessage="Send Password Reset Email" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            {pageState === 'SUCCESS' ? (
              <div className="py-2">
                <FormattedMessage defaultMessage="The password reset email has been sent." />
              </div>
            ) : (
              <>
                <ErrorMessageBox>
                  {pageState === 'NOT_FOUND' ? (
                    <FormattedMessage defaultMessage="The email address is not registered." />
                  ) : (
                    <FormattedMessage defaultMessage="An unknown error occurred." />
                  )}
                </ErrorMessageBox>
                <div className="text-right">
                  <Button onClick={handleRetry}>
                    <FormattedMessage defaultMessage="Try Again" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        <div className="mt-4 text-right">
          <a href={loginPaneHref} className={classes.link} onClick={handleOpenLogin}>
            <FormattedMessage defaultMessage="Back to login" />
          </a>
        </div>
      </div>
    </PaneBox>
  );
};

export default PaneResetPassword;
