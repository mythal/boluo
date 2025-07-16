'use client';
import { get, post } from '@boluo/api-browser';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import useSWRMutation from 'swr/mutation';

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const intl = useIntl();

  const token = searchParams.get('token');
  const backHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Email verification mutation
  const {
    trigger: triggerVerify,
    isMutating: isVerifying,
    error: verifyError,
    data: verifyResult,
  } = useSWRMutation(
    token ? (['/users/verify_email', token] as const) : null,
    async ([path, token]) => {
      const result = await get(path, { token });
      return result.unwrap();
    },
    {
      onSuccess: () => {
        setTimeout(backHome, 3000);
      },
    },
  );

  // Resend email mutation
  const {
    trigger: triggerResend,
    isMutating: isResending,
    error: resendError,
  } = useSWRMutation(
    ['/users/resend_email_verification', intl.locale] as const,
    async ([path, lang]) => {
      const result = await post(path, null, { lang });
      return result.unwrap();
    },
  );

  // Auto-trigger verification when component mounts
  useEffect(() => {
    if (token) {
      triggerVerify();
    }
  }, [token, triggerVerify]);

  const handleResendEmail = async () => {
    await triggerResend();
    alert(
      intl.formatMessage({
        defaultMessage: 'Verification email sent! Please check your inbox.',
      }),
    );
  };

  // No token provided
  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl text-red-600">✗</div>
        <h1 className="mb-4 text-lg font-semibold">
          <FormattedMessage defaultMessage="Invalid verification link" />
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          <FormattedMessage defaultMessage="The verification link is missing or invalid." />
        </p>
        <Button onClick={backHome} variant="detail">
          <FormattedMessage defaultMessage="Go to App" />
        </Button>
      </div>
    );
  }

  // Verifying state
  if (isVerifying) {
    return (
      <div className="text-center">
        <h1 className="mb-4 text-lg font-semibold">
          <FormattedMessage defaultMessage="Verifying your email..." />
        </h1>
      </div>
    );
  }

  // Success state
  if (!isVerifying && !verifyError && token) {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl text-green-600">✓</div>
        <h1 className="mb-2 text-lg font-semibold">
          <FormattedMessage defaultMessage="Email verified successfully!" />
        </h1>
        <p className="mb-4 text-sm text-gray-600">
          <FormattedMessage defaultMessage="Your email has been verified. You will be redirected to the home page shortly." />
        </p>
        <Button onClick={backHome}>
          <FormattedMessage defaultMessage="Go to Home" />
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-4 text-4xl text-red-600">✗</div>
      <h1 className="mb-4 text-lg font-semibold">
        <FormattedMessage defaultMessage="Email verification failed" />
      </h1>
      {verifyError && (
        <div className="mb-4">
          <ErrorMessageBox>
            <FormattedMessage defaultMessage="Verification failed. Please try again or contact support." />
          </ErrorMessageBox>
        </div>
      )}
      <div className="space-y-2">
        <p className="mb-4 text-sm text-gray-600">
          <FormattedMessage defaultMessage="The verification link may have expired or is invalid. You can request a new verification email." />
        </p>
        <Button onClick={handleResendEmail} disabled={isResending} className="mr-2">
          {isResending ? (
            <FormattedMessage defaultMessage="Sending..." />
          ) : (
            <FormattedMessage defaultMessage="Resend verification email" />
          )}
        </Button>
        <Button onClick={backHome} variant="detail">
          <FormattedMessage defaultMessage="Go to App" />
        </Button>
      </div>
      {resendError && (
        <div className="mt-4">
          <ErrorMessageBox>
            <FormattedMessage defaultMessage="Failed to resend verification email. Please try again later." />
          </ErrorMessageBox>
        </div>
      )}
    </div>
  );
}
