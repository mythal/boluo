'use client';
import { get, post } from '@boluo/api-browser';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';
import useSWRMutation, {
  type SWRMutationConfiguration,
  type SWRMutationResponse,
} from 'swr/mutation';
import { useQueryCurrentUser } from '@boluo/common';
import type { ResendEmailVerificationResult, User } from '@boluo/api';
import { useQueryIsEmailVerified } from '@boluo/common/hooks';
import Link from 'next/link';

const useSendVerificationEmail = (): SWRMutationResponse<
  ResendEmailVerificationResult,
  Error,
  [string, string]
> => {
  const intl = useIntl();
  return useSWRMutation(
    ['/users/resend_email_verification', intl.locale] as const,
    async ([path, lang]) => {
      const result = await post(path, null, { lang });
      return result.unwrap();
    },
  );
};

const useCountdown = (seconds: number) => {
  const [countdown, setCountdown] = useState(seconds);
  const interval = useRef<number | undefined>(undefined);
  useEffect(() => {
    setCountdown(seconds);
    interval.current = window.setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => {
      window.clearInterval(interval.current);
    };
  }, [seconds]);
  return countdown;
};

export function VerifyEmailContent({
  token,
  currentUser,
}: {
  token: string;
  currentUser: User | null | undefined;
}) {
  const router = useRouter();
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
        setTimeout(() => {
          if (currentUser) {
            router.push('/');
          } else {
            router.push('/account/login');
          }
        }, 3000);
      },
    },
  );

  useEffect(() => {
    triggerVerify();
  }, [triggerVerify]);

  // Success state
  if (!isVerifying && !verifyError && verifyResult) {
    return (
      <div className="py-4">
        <h1 className="mb-2 text-lg font-semibold">
          <span className="text-state-success-text mr-2">✓</span>
          <FormattedMessage defaultMessage="Email verified successfully!" />
        </h1>
        <p className="text-sm">
          <FormattedMessage defaultMessage="Your email has been verified. You will be redirected shortly." />
        </p>
      </div>
    );
  }

  if (!isVerifying && verifyError) {
    return (
      <div className="py-4">
        <h1 className="mb-2 text-lg font-semibold">
          <FormattedMessage defaultMessage="Email verification failed" />
        </h1>
        {verifyError && (
          <div className="">
            <ErrorMessageBox>
              <FormattedMessage defaultMessage="Verification failed. Please try again or contact support." />
            </ErrorMessageBox>
          </div>
        )}
        {currentUser && <StartVerifyEmail currentUser={currentUser} />}
      </div>
    );
  }

  return (
    <div className="py-4">
      <h1 className="text-lg font-semibold">
        <FormattedMessage defaultMessage="Verifying your email..." />
      </h1>
    </div>
  );
}

function StartVerifyEmail({
  currentUser,
  fromForumLogin,
}: {
  currentUser: User;
  fromForumLogin?: boolean;
}) {
  const { data: isEmailVerified } = useQueryIsEmailVerified();
  const {
    trigger: triggerResend,
    isMutating: isResending,
    data: resendResult,
    error: resendError,
  } = useSendVerificationEmail();

  const [watingResendSeconds, setWatingResendSeconds] = useState(0);
  const countdown = useCountdown(watingResendSeconds);

  if (isEmailVerified) {
    return (
      <div className="mt-4">
        <FormattedMessage defaultMessage="Your email has been verified." />
      </div>
    );
  }
  return (
    <div>
      <div className="pt-4">
        {fromForumLogin ? (
          <FormattedMessage defaultMessage="Please verify your email to login to the forum." />
        ) : (
          <FormattedMessage defaultMessage="Please verify your email to continue." />
        )}
      </div>
      {resendResult && (
        <div className="pt-4">
          <FormattedMessage defaultMessage="Verification email sent! Please check your inbox." />
        </div>
      )}
      {resendError && (
        <div className="pt-4">
          <ErrorMessageBox>
            <FormattedMessage defaultMessage="Failed to resend verification email. Please try again later." />
          </ErrorMessageBox>
        </div>
      )}
      <div className="pt-4">
        <Button
          onClick={() => {
            setWatingResendSeconds(10);
            triggerResend();
          }}
          disabled={isResending || countdown > 0}
        >
          {countdown > 0 ? (
            <FormattedMessage
              defaultMessage="Resend in {countdown} seconds"
              values={{ countdown }}
            />
          ) : isResending ? (
            <FormattedMessage defaultMessage="Sending..." />
          ) : (
            <FormattedMessage defaultMessage="Send verification email" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function EmailVerification() {
  const searchParams = useSearchParams();
  const { data: currentUser } = useQueryCurrentUser();

  const source = searchParams.get('source');
  const token = searchParams.get('token');
  const fromForumLogin = source != null && source.toLocaleLowerCase() === 'forum_login';
  if (!token) {
    if (currentUser) {
      return <StartVerifyEmail currentUser={currentUser} fromForumLogin={fromForumLogin} />;
    } else {
      return (
        <div className="mt-4">
          <FormattedMessage
            defaultMessage="Please {login} to verify your email."
            values={{
              login: (
                <Link
                  className="underline"
                  href={`/account/login?next=${encodeURIComponent('/account/verify-email')}`}
                >
                  Login
                </Link>
              ),
            }}
          />
        </div>
      );
    }
  }

  return <VerifyEmailContent token={token} currentUser={currentUser} />;
}
