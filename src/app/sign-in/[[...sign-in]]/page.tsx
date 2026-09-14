'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

export default function Page() {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [clientError, setClientError] = useState('');
  const requestedCallback = searchParams.get('callbackURL');
  const authError = searchParams.get('error');
  const callbackURL = requestedCallback?.startsWith('/')
    ? requestedCallback
    : '/';

  async function continueWithAuthy() {
    if (busy) return;
    setBusy(true);
    setClientError('');

    try {
      const result = await authClient.signIn.social({
        provider: 'authy',
        callbackURL,
      });
      if (!result.error) return;
      setClientError(
        result.error.message || 'Unable to start sign-in. Please try again.'
      );
    } catch {
      setClientError('Unable to start sign-in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-svw h-svh bg-purple flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center text-[#1d1c1d] shadow-2xl">
        <h1 className="text-3xl font-bold">Sign in to PulseChat</h1>
        <p className="mt-3 text-sm text-[#616061]">
          Continue with your organization&apos;s Authy account.
        </p>
        {(authError || clientError) && (
          <p
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {authError === 'please_restart_the_process'
              ? 'That sign-in request expired or was already used. Start a new secure sign-in below.'
              : clientError ||
                'Sign-in could not be completed. Please start again.'}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          className="mt-8 w-full rounded-md bg-[#4a154b] px-4 py-3 font-bold text-white hover:bg-[#611f69]"
          onClick={continueWithAuthy}
        >
          {busy ? 'Redirecting…' : 'Continue with Authy'}
        </button>
      </div>
    </div>
  );
}
