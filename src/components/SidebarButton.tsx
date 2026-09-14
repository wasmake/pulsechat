import { ComponentType } from 'react';
import clsx from 'clsx';

export interface SidebarButtonProps {
  active?: boolean;
  boldText?: boolean;
  className?: string;
  icon: ComponentType<{ color: string; size: number }>;
  iconSize?: 'md' | 'lg';
  onClick?: () => void;
  title?: string;
  badge?: number;
}

const SidebarButton = ({
  active = false,
  boldText = false,
  className,
  icon: Icon,
  iconSize = 'md',
  onClick,
  title,
  badge,
}: SidebarButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'sidebar-btn inline-flex h-8 w-full cursor-pointer items-center rounded-md pl-4 pr-2.5 font-lato leading-8 text-[#a1a1aa] disabled:bg-transparent [&_path]:disabled:fill-[#71717a]',
        active ? 'bg-[#27272a]' : 'hover:bg-[#18181b] hover:text-[#fafafa]',
        className
      )}
    >
      <span className="inline-flex item-center justify-center -ml-1 mr-2">
        <Icon
          size={iconSize === 'md' ? 16 : 20}
          color={active ? 'var(--primary)' : 'var(--secondary)'}
        />
      </span>
      <span
        className={clsx(
          'text-[15px] truncate',
          (active || boldText) && 'text-white',
          boldText && 'font-extrabold'
        )}
      >
        {title}
      </span>
      {!!badge && (
        <span className="ml-auto min-w-5 rounded-full bg-[#e01e5a] px-1.5 text-center text-[11px] font-bold leading-5 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

export default SidebarButton;
