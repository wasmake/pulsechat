'use client';

import { signOut } from '@/lib/auth-client';

type SignOutButtonProps = {
  children: React.ReactNode;
  className?: string;
};

export default function SignOutButton({
  children,
  className,
}: SignOutButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        signOut({
          fetchOptions: { onSuccess: () => location.assign('/sign-in') },
        })
      }
    >
      {children}
    </button>
  );
}
