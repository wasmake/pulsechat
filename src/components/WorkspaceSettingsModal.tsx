import { FormEvent, useEffect, useMemo, useState } from 'react';

import { Workspace } from '@/app/client/layout';
import Avatar from './Avatar';
import Button from './Button';
import Modal from './Modal';
import TextField from './TextField';

export type WorkspaceSettingsTab =
  | 'overview'
  | 'invites'
  | 'domains'
  | 'roles'
  | 'members';

type Role = {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  isDefault: boolean;
  isManaged: boolean;
};

type Settings = {
  permissions: string[];
  isOwner: boolean;
  roles: Role[];
  inviteLinks: Array<{
    id: string;
    token: string;
    roleId: string | null;
    maxUses: number | null;
    useCount: number;
    expiresAt: string | null;
    revokedAt: string | null;
    createdAt: string;
  }>;
  domains: Array<{ id: string; domain: string; roleId: string | null }>;
  members: Array<{
    id: string;
    userId: string;
    roleId: string | null;
    isOwner: boolean;
    user: { id: string; name: string; email: string; image: string | null };
  }>;
};

const permissionOptions = [
  ['manage_workspace', 'Manage workspace'],
  ['manage_channels', 'Manage channels'],
  ['manage_invites', 'Create invite links'],
  ['manage_roles', 'Manage roles'],
  ['manage_members', 'Manage members'],
] as const;

const tabPermissions: Record<WorkspaceSettingsTab, string> = {
  overview: 'manage_workspace',
  invites: 'manage_invites',
  domains: 'manage_workspace',
  roles: 'manage_roles',
  members: 'manage_members',
};

const inputClass =
  'h-9 rounded-md border border-[#3f3f46] bg-[#09090b] px-3 text-sm text-[#fafafa] outline-none placeholder:text-[#52525b] focus:border-[#71717a]';

type WorkspaceSettingsModalProps = {
  open: boolean;
  workspace: Workspace;
  initialTab?: WorkspaceSettingsTab;
  onClose: () => void;
  onSave: (workspace: Workspace) => void;
};

export default function WorkspaceSettingsModal({
  open,
  workspace,
  initialTab = 'overview',
  onClose,
  onSave,
}: WorkspaceSettingsModalProps) {
  const [tab, setTab] = useState<WorkspaceSettingsTab>(initialTab);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState(workspace.name);
  const [image, setImage] = useState(workspace.image || '');
  const [accentColor, setAccentColor] = useState(workspace.accentColor);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [expiryHours, setExpiryHours] = useState('168');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [domain, setDomain] = useState('');
  const [domainRoleId, setDomainRoleId] = useState('');
  const [editingRoleId, setEditingRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleColor, setRoleColor] = useState('#a1a1aa');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  const loadSettings = async () => {
    const response = await fetch(`/api/workspaces/${workspace.id}/settings`);
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || 'Unable to load settings');
    setSettings(result);
    setTab((current) =>
      result.permissions.includes(tabPermissions[current])
        ? current
        : (Object.keys(tabPermissions) as WorkspaceSettingsTab[]).find(
            (candidate) =>
              result.permissions.includes(tabPermissions[candidate])
          ) || 'overview'
    );
    const defaultRole = result.roles.find((role: Role) => role.isDefault);
    setInviteRoleId((current) => current || defaultRole?.id || '');
    setDomainRoleId((current) => current || defaultRole?.id || '');
  };

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setName(workspace.name);
    setImage(workspace.image || '');
    setAccentColor(workspace.accentColor);
    setError('');
    setLoading(true);
    loadSettings()
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load settings'
        )
      )
      .finally(() => setLoading(false));
    // The workspace ID and opening state define a fresh settings session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspace.id, initialTab]);

  const can = (permission: string) =>
    Boolean(settings?.permissions.includes(permission));
  const activeInvites = useMemo(
    () => settings?.inviteLinks.filter((invite) => !invite.revokedAt) || [],
    [settings]
  );

  const runAction = async (body: Record<string, unknown>) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Unable to save changes');
      await loadSettings();
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Unable to save changes'
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveOverview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image, accentColor }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Unable to save changes');
      onSave({ ...workspace, ...result.workspace });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save changes'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role?: Role) => {
    setEditingRoleId(role?.id || '');
    setRoleName(role?.name || '');
    setRoleColor(role?.color || '#a1a1aa');
    setRolePermissions(role?.permissions || []);
  };

  const tabs: Array<[WorkspaceSettingsTab, string, string]> = [
    ['overview', 'Overview', 'manage_workspace'],
    ['invites', 'Invite links', 'manage_invites'],
    ['domains', 'Domain auto-join', 'manage_workspace'],
    ['roles', 'Roles', 'manage_roles'],
    ['members', 'Members', 'manage_members'],
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${workspace.name} settings`}
      loading={loading}
      size="wide"
    >
      <div className="grid min-h-[500px] gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        <nav className="space-y-1 border-b border-[#27272a] pb-4 sm:border-b-0 sm:border-r sm:pr-4">
          {tabs
            .filter(([, , permission]) => can(permission))
            .map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value);
                  setError('');
                }}
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  tab === value
                    ? 'bg-[#27272a] text-[#fafafa]'
                    : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]'
                }`}
              >
                {label}
              </button>
            ))}
        </nav>

        <div className="min-w-0">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-md bg-red-950/40 px-3 py-2 text-sm text-[#fca5a5]"
            >
              {error}
            </p>
          )}
          {!settings && loading && (
            <p className="text-sm text-[#71717a]">Loading settings…</p>
          )}

          {settings && tab === 'overview' && can('manage_workspace') && (
            <form className="space-y-5" onSubmit={saveOverview}>
              <div>
                <h3 className="text-lg font-semibold">Workspace overview</h3>
                <p className="mt-1 text-sm text-[#71717a]">
                  Update how this workspace appears to members.
                </p>
              </div>
              <TextField
                label="Workspace name"
                name="workspaceName"
                placeholder="Your team name"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <TextField
                label="Workspace image"
                name="workspaceImage"
                type="url"
                placeholder="https://example.com/team.png"
                value={image}
                onChange={(event) => setImage(event.target.value)}
              />
              <label className="block text-sm font-medium text-[#e4e4e7]">
                Accent color
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                  className="mt-2 block h-10 w-20 cursor-pointer rounded-md border border-[#3f3f46] bg-[#09090b] p-1"
                />
              </label>
              <div className="flex justify-end">
                <Button type="submit" loading={loading} disabled={!name.trim()}>
                  Save changes
                </Button>
              </div>
            </form>
          )}

          {settings && tab === 'invites' && can('manage_invites') && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Invite links</h3>
                <p className="mt-1 text-sm text-[#71717a]">
                  Create reusable links with optional expiry and claim limits.
                </p>
              </div>
              <form
                className="grid gap-3 rounded-lg border border-[#27272a] bg-[#09090b] p-4 sm:grid-cols-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await runAction({
                    action: 'create_invite',
                    maxUses: maxUses ? Number(maxUses) : null,
                    expiryHours: expiryHours ? Number(expiryHours) : null,
                    roleId: inviteRoleId || null,
                  });
                }}
              >
                <label className="text-xs font-medium text-[#a1a1aa]">
                  Claim limit
                  <input
                    className={`${inputClass} mt-2 w-full`}
                    type="number"
                    min="1"
                    max="100000"
                    value={maxUses}
                    onChange={(event) => setMaxUses(event.target.value)}
                    placeholder="Unlimited"
                  />
                </label>
                <label className="text-xs font-medium text-[#a1a1aa]">
                  Expires
                  <select
                    className={`${inputClass} mt-2 w-full`}
                    value={expiryHours}
                    onChange={(event) => setExpiryHours(event.target.value)}
                  >
                    <option value="">Never</option>
                    <option value="1">1 hour</option>
                    <option value="24">1 day</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-[#a1a1aa]">
                  Role
                  <select
                    className={`${inputClass} mt-2 w-full`}
                    value={inviteRoleId}
                    onChange={(event) => setInviteRoleId(event.target.value)}
                  >
                    {settings.roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-3">
                  <Button type="submit" loading={loading}>
                    Generate link
                  </Button>
                </div>
              </form>
              <div className="divide-y divide-[#27272a] rounded-lg border border-[#27272a]">
                {activeInvites.map((invite) => {
                  const url = `${location.origin}/invite/${invite.token}`;
                  const role = settings.roles.find(
                    (item) => item.id === invite.roleId
                  );
                  return (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-[#e4e4e7]">{url}</p>
                        <p className="mt-1 text-xs text-[#71717a]">
                          {invite.useCount}/{invite.maxUses ?? '∞'} claims ·{' '}
                          {invite.expiresAt
                            ? `expires ${new Date(invite.expiresAt).toLocaleString()}`
                            : 'never expires'}{' '}
                          · {role?.name || 'Member'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(url)}
                          className="rounded-md border border-[#3f3f46] px-3 py-1.5 text-xs font-medium hover:bg-[#27272a]"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            runAction({
                              action: 'revoke_invite',
                              inviteId: invite.id,
                            })
                          }
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-[#f87171] hover:bg-red-950/40"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
                {!activeInvites.length && (
                  <p className="p-4 text-sm text-[#71717a]">
                    No active invite links.
                  </p>
                )}
              </div>
            </div>
          )}

          {settings && tab === 'domains' && can('manage_workspace') && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Domain auto-join</h3>
                <p className="mt-1 text-sm text-[#71717a]">
                  Verified users with a matching company email automatically
                  join this workspace.
                </p>
              </div>
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (
                    await runAction({
                      action: 'create_domain',
                      domain,
                      roleId: domainRoleId || null,
                    })
                  )
                    setDomain('');
                }}
              >
                <input
                  className={`${inputClass} min-w-0 flex-1`}
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="tryaxenor.com"
                  required
                />
                <select
                  className={inputClass}
                  value={domainRoleId}
                  onChange={(event) => setDomainRoleId(event.target.value)}
                >
                  {settings.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" loading={loading}>
                  Add domain
                </Button>
              </form>
              <div className="divide-y divide-[#27272a] rounded-lg border border-[#27272a]">
                {settings.domains.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">@{rule.domain}</p>
                      <p className="text-xs text-[#71717a]">
                        Joins as{' '}
                        {settings.roles.find((role) => role.id === rule.roleId)
                          ?.name || 'Member'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        runAction({
                          action: 'delete_domain',
                          domainId: rule.id,
                        })
                      }
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-[#f87171] hover:bg-red-950/40"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {!settings.domains.length && (
                  <p className="p-4 text-sm text-[#71717a]">
                    No auto-join domains configured.
                  </p>
                )}
              </div>
            </div>
          )}

          {settings && tab === 'roles' && can('manage_roles') && (
            <div className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div>
                <button
                  type="button"
                  onClick={() => selectRole()}
                  className="mb-2 w-full rounded-md border border-[#3f3f46] px-3 py-2 text-sm font-medium hover:bg-[#27272a]"
                >
                  New role
                </button>
                {settings.roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${editingRoleId === role.id ? 'bg-[#27272a]' : 'hover:bg-[#18181b]'}`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: role.color }}
                    />
                    {role.name}
                  </button>
                ))}
              </div>
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (
                    await runAction({
                      action: 'save_role',
                      roleId: editingRoleId || null,
                      name: roleName,
                      color: roleColor,
                      permissions: rolePermissions,
                    })
                  )
                    selectRole();
                }}
              >
                <div>
                  <h3 className="text-lg font-semibold">
                    {editingRoleId ? 'Edit role' : 'Create role'}
                  </h3>
                  <p className="mt-1 text-sm text-[#71717a]">
                    Group permissions into roles and assign them to members.
                  </p>
                </div>
                {settings.roles.find((role) => role.id === editingRoleId)
                  ?.isManaged ? (
                  <p className="rounded-md bg-[#18181b] p-3 text-sm text-[#a1a1aa]">
                    Built-in roles preserve compatibility and cannot be edited.
                  </p>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-[#a1a1aa]">
                      Role name
                      <input
                        className={`${inputClass} mt-2 w-full`}
                        value={roleName}
                        onChange={(event) => setRoleName(event.target.value)}
                        required
                        maxLength={40}
                      />
                    </label>
                    <label className="block text-xs font-medium text-[#a1a1aa]">
                      Color
                      <input
                        type="color"
                        className="mt-2 block h-9 w-20 rounded-md border border-[#3f3f46] bg-[#09090b] p-1"
                        value={roleColor}
                        onChange={(event) => setRoleColor(event.target.value)}
                      />
                    </label>
                    <fieldset>
                      <legend className="mb-2 text-xs font-medium text-[#a1a1aa]">
                        Permissions
                      </legend>
                      <div className="space-y-2">
                        {permissionOptions.map(([value, label]) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={rolePermissions.includes(value)}
                              onChange={(event) =>
                                setRolePermissions((current) =>
                                  event.target.checked
                                    ? [...current, value]
                                    : current.filter((item) => item !== value)
                                )
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <div className="flex justify-between">
                      <div>
                        {editingRoleId && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm('Delete this role?')) {
                                await runAction({
                                  action: 'delete_role',
                                  roleId: editingRoleId,
                                });
                                selectRole();
                              }
                            }}
                            className="rounded-md px-3 py-2 text-sm font-medium text-[#f87171] hover:bg-red-950/40"
                          >
                            Delete role
                          </button>
                        )}
                      </div>
                      <Button type="submit" loading={loading}>
                        {editingRoleId ? 'Save role' : 'Create role'}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}

          {settings && tab === 'members' && can('manage_members') && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Members</h3>
                <p className="mt-1 text-sm text-[#71717a]">
                  Assign roles or remove access to this workspace.
                </p>
              </div>
              <div className="divide-y divide-[#27272a] rounded-lg border border-[#27272a]">
                {settings.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar width={36} borderRadius={8} data={member.user} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.user.name}
                          {member.isOwner && (
                            <span className="ml-2 rounded bg-[#27272a] px-1.5 py-0.5 text-[10px] uppercase text-[#a1a1aa]">
                              Owner
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-[#71717a]">
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    {!member.isOwner && (
                      <div className="flex gap-2">
                        <select
                          className={inputClass}
                          value={member.roleId || ''}
                          onChange={(event) =>
                            runAction({
                              action: 'set_member_role',
                              userId: member.userId,
                              roleId: event.target.value,
                            })
                          }
                        >
                          {settings.roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${member.user.name}?`))
                              runAction({
                                action: 'remove_member',
                                userId: member.userId,
                              });
                          }}
                          className="rounded-md px-3 py-2 text-xs font-medium text-[#f87171] hover:bg-red-950/40"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
