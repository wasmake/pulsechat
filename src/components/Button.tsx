import { ReactNode } from 'react';

import Spinner from './Spinner';

interface ButtonProps {
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

const Button = ({
  children,
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  variant = 'primary',
  onClick,
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={
        'inline-flex min-w-[82px] items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
        (variant === 'primary'
          ? 'bg-[#fafafa] text-[#18181b] hover:bg-[#e4e4e7] '
          : 'border border-[#3f3f46] bg-[#18181b] text-[#e4e4e7] hover:bg-[#27272a] ') +
        className
      }
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {!loading && children}
      {loading && <Spinner />}
    </button>
  );
};

export default Button;
