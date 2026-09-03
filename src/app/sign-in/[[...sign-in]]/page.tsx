'use client';

import { useSearchParams } from 'next/navigation';

import { authClient } from '@/lib/auth-client';

export default function Page() {
  const searchParams = useSearchParams();
  const requestedCallback = searchParams.get('callbackURL');
  const callbackURL = requestedCallback?.startsWith('/')
    ? requestedCallback
    : '/';

  return (
    <div className="w-svw h-svh bg-purple flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center text-[#1d1c1d] shadow-2xl">
        <h1 className="text-3xl font-bold">Sign in to PulseChat</h1>
        <p className="mt-3 text-sm text-[#616061]">
          Continue with your organization&apos;s Authy account.
        </p>
        <button
          type="button"
          className="mt-8 w-full rounded-md bg-[#4a154b] px-4 py-3 font-bold text-white hover:bg-[#611f69]"
          onClick={() =>
            authClient.signIn.social({ provider: 'authy', callbackURL })
          }
        >
          Continue with Authy
        </button>
      </div>
    </div>
  );
}
