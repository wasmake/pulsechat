'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import Navbar from '@/components/Navbar';
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
    <div className="min-h-screen bg-[#09090b] font-lato text-[#fafafa]">
      <Navbar />
      <main className="mx-auto flex max-w-5xl justify-center px-5 py-16 sm:px-6 sm:py-24">
        <section className="w-full max-w-md rounded-xl border border-[#27272a] bg-[#0f0f12] p-6 shadow-2xl sm:p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3f3f46] bg-[#18181b] text-[#d4d4d8]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12a1 1 0 0 1 1 1v8H5v-8a1 1 0 0 1 1-1Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-6 text-xs font-medium text-[#71717a]">
            Secure workspace access
          </p>
          <h1 className="mt-1 font-outfit text-2xl font-semibold tracking-tight">
            Sign in to PulseChat
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#a1a1aa]">
            Continue with your organization&apos;s Authy account to access your
            workspaces.
          </p>
          {(authError || clientError) && (
            <p
              role="alert"
              className="mt-5 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-[#fca5a5]"
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
            className="mt-7 w-full rounded-md bg-[#fafafa] px-4 py-2.5 text-sm font-medium text-[#18181b] transition-colors hover:bg-[#e4e4e7] disabled:cursor-wait disabled:opacity-50"
            onClick={continueWithAuthy}
          >
            {busy ? 'Redirecting…' : 'Continue with Authy'}
          </button>
          <p className="mt-4 text-center text-xs text-[#52525b]">
            Authentication is managed securely by Authy SSO.
          </p>
        </section>
      </main>
    </div>
  );
}
