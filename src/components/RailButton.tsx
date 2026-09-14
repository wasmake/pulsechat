import { ReactNode } from 'react';
import clsx from 'clsx';

export interface RailButtonProps {
  active?: boolean;
  icon: ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
  badge?: number;
}

const RailButton = ({
  active = false,
  icon,
  onClick,
  title,
  className,
  badge,
}: RailButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'group flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-2 text-center text-[11px] font-medium leading-3 text-[#a1a1aa] hover:text-[#fafafa] [&_svg]:transition-all',
        className
      )}
    >
      <div
        className={clsx(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border border-transparent transition-colors group-hover:bg-[#27272a]',
          active && 'border-[#3f3f46] bg-[#27272a]',
          !active && 'bg-transparent'
        )}
      >
        {icon}
        {!!badge && (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#e01e5a] px-1 text-[10px] leading-4 text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <div>{title}</div>
    </button>
  );
};

export default RailButton;
