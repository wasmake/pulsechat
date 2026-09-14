import Link from 'next/link';

const PulseMark = () => (
  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
    <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 17h5l2.4-7 4.2 14 3.2-10 2 3H28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

const Navbar = () => (
  <header className="border-b border-[#27272a] bg-[#09090b]">
    <nav className="mx-auto flex h-14 max-w-5xl items-center px-5 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <PulseMark />
        <span className="font-outfit text-base font-semibold tracking-tight text-[#fafafa]">
          PulseChat
        </span>
      </Link>
    </nav>
  </header>
);

export default Navbar;
