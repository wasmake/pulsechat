import { ReactNode, useRef } from 'react';

interface ModalProps {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  title?: string;
  loading?: boolean;
  size?: 'default' | 'wide';
}

const Modal = ({
  children,
  loading = false,
  open,
  onClose,
  title,
  size = 'default',
}: ModalProps) => {
  const modal = useRef<HTMLDivElement>(null);

  return (
    <div
      role="presentation"
      className={`z-[9999] fixed left-0 top-0 flex h-full min-h-screen w-full items-center justify-center bg-[#0009] px-4 py-5 ${
        open ? 'block' : 'hidden'
      }`}
    >
      <div
        ref={modal}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={`flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-xl border border-[#27272a] bg-[#0f0f12] px-5 py-5 text-[#fafafa] shadow-2xl sm:px-6 ${size === 'wide' ? 'max-w-[920px]' : 'max-w-[580px]'}`}
      >
        {title && (
          <div className="pb-[18px] flex items-center justify-between">
            <h3 className="font-outfit text-xl font-semibold tracking-tight">
              {title}
            </h3>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              disabled={loading}
              className="group ml-2 flex h-9 w-9 -mr-2 items-center justify-center rounded-md hover:bg-[#27272a]"
            >
              <svg
                data-0ko="true"
                data-qa="close"
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="w-5 h-5"
              >
                <path
                  fill="currentColor"
                  className="fill-[#a1a1aa] group-hover:fill-[#fafafa]"
                  fillRule="evenodd"
                  d="M16.53 3.47a.75.75 0 0 1 0 1.06L11.06 10l5.47 5.47a.75.75 0 0 1-1.06 1.06L10 11.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L8.94 10 3.47 4.53a.75.75 0 0 1 1.06-1.06L10 8.94l5.47-5.47a.75.75 0 0 1 1.06 0"
                  clipRule="evenodd"
                ></path>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;
