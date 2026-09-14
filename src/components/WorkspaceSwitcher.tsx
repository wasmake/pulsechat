import { MutableRefObject, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

import { AppContext, Workspace } from '@/app/client/layout';
import Avatar from './Avatar';
import Plus from './icons/Plus';
import useClickOutside from '@/hooks/useClickOutside';

const WorkspaceSwitcher = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const {
    workspace,
    setWorkspace,
    otherWorkspaces,
    setOtherWorkspaces,
    setChannel,
  } = useContext(AppContext);

  const domNode = useClickOutside(() => {
    setOpen(false);
  }, true) as MutableRefObject<HTMLDivElement>;

  const switchWorkspace = (otherWorkspace: Workspace) => {
    setOtherWorkspaces([
      ...otherWorkspaces.filter((w) => w.id !== otherWorkspace.id),
      workspace,
    ]);
    setWorkspace(otherWorkspace);
    setChannel(otherWorkspace.channels[0]);
    router.push(
      `/client/${otherWorkspace.id}/${otherWorkspace.channels[0].id}`
    );
  };

  return (
    <div
      onClick={() => setOpen((prev) => !prev)}
      className="relative w-9 h-9 mb-[5px] cursor-pointer"
    >
      <Avatar
        width={36}
        borderRadius={8}
        fontSize={20}
        fontWeight={700}
        data={{ name: workspace.name, image: workspace.image }}
      />
      <div
        ref={domNode}
        className={clsx(
          'absolute -left-3 top-11 z-[99] w-[320px] flex-col items-start overflow-hidden rounded-xl border border-[#27272a] bg-[#0f0f12] py-1 text-left text-[#d4d4d8] shadow-2xl',
          open ? 'flex' : 'hidden'
        )}
      >
        <div className="w-full px-4 py-3 text-sm hover:bg-[#18181b]">
          <div className="truncate font-medium">{workspace.name}</div>
          <div className="mt-0.5 text-xs text-[#71717a]">Current workspace</div>
        </div>
        <div className="my-1 h-px w-full bg-[#27272a]" />
        {otherWorkspaces.map((otherWorkspace) => (
          <button
            key={otherWorkspace.id}
            className="flex h-[52px] w-full items-center gap-3 px-4 text-sm hover:bg-[#18181b]"
            onClick={() => switchWorkspace(otherWorkspace)}
          >
            <Avatar
              width={36}
              borderRadius={8}
              fontSize={20}
              fontWeight={700}
              data={{ name: otherWorkspace.name, image: otherWorkspace.image }}
            />
            <div className="flex flex-col text-left">
              <div className="truncate font-medium leading-[22px]">
                {otherWorkspace.name}
              </div>
              <div className="text-xs leading-[18px] text-[#71717a]">
                Switch workspace
              </div>
            </div>
          </button>
        ))}
        <button
          className="flex h-[52px] w-full items-center gap-3 px-4 text-sm hover:bg-[#18181b]"
          onClick={() => router.push(`/get-started`)}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3f3f46] bg-[#18181b]">
            <Plus color="var(--primary)" filled />
          </div>
          <div className="flex flex-col text-left text-white">
            Add a workspace
          </div>
        </button>
      </div>
    </div>
  );
};

export default WorkspaceSwitcher;
