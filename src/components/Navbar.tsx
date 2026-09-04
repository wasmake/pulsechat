type NavbarProps = {
  action: () => void;
};

const PulseMark = () => (
  <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#6d5dfc] shadow-[0_0_28px_#6d5dfc55]">
    <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
      <path
        d="M4 17h5l2.4-7 4.2 14 3.2-10 2 3H28"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

const Navbar = ({ action }: NavbarProps) => (
  <header className="border-b border-white/10 bg-[#0d0f14]/85 backdrop-blur-xl">
    <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <PulseMark />
        <span className="font-outfit text-xl font-bold tracking-tight text-white">
          PulseChat
        </span>
      </div>
      <form action={action}>
        <button
          type="submit"
          className="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white transition hover:border-[#8b7fff] hover:bg-[#6d5dfc]/15"
        >
          New workspace
        </button>
      </form>
    </nav>
  </header>
);

export default Navbar;
