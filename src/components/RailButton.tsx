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
        'w-full group py-2 cursor-pointer flex flex-col gap-1 text-center text-[11px] leading-3 font-bold items-center justify-center [&_svg]:transition-all [&_svg]:hover:scale-[1.2]',
        className
      )}
    >
      <div
        className={clsx(
          'relative w-9 h-9 flex items-center justify-center transition-[background] duration-[125ms] ease-[cubic-bezier(.17,.67,.55,1.09)] group-hover:bg-[#f8f8f840] rounded-lg',
          active && 'bg-[#f8f8f840]',
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
