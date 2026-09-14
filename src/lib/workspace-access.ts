import { isSuperAdmin } from './admin';
import prisma from './prisma';

export const workspacePermissionKeys = [
  'manage_workspace',
  'manage_channels',
  'manage_invites',
  'manage_roles',
  'manage_members',
] as const;

export type WorkspacePermission = (typeof workspacePermissionKeys)[number];

export const allWorkspacePermissions: WorkspacePermission[] = [
  ...workspacePermissionKeys,
];

export function parseWorkspacePermissions(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is WorkspacePermission =>
          workspacePermissionKeys.includes(item as WorkspacePermission)
        )
      : [];
  } catch {
    return [];
  }
}

export async function getWorkspaceAccess(
  workspaceId: string,
  user: { id: string; authyPermissions?: string | null }
) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });
  if (!workspace) return null;

  const membership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
    include: { workspaceRole: true },
  });
  const owner = workspace.ownerId === user.id;
  const globalAdmin = isSuperAdmin(user);
  const legacyAdmin = membership?.role?.toLowerCase() === 'admin';
  const permissions = new Set(
    owner || globalAdmin || legacyAdmin
      ? allWorkspacePermissions
      : parseWorkspacePermissions(membership?.workspaceRole?.permissions)
  );

  return {
    workspace,
    membership,
    isMember: Boolean(membership),
    isOwner: owner,
    isGlobalAdmin: globalAdmin,
    permissions,
    can: (permission: WorkspacePermission) => permissions.has(permission),
  };
}

export async function syncDomainMemberships(user: {
  id: string;
  email: string;
}) {
  const domain = user.email.split('@')[1]?.trim().toLowerCase();
  if (!domain) return 0;

  const rules = await prisma.workspaceDomainRule.findMany({
    where: { domain },
    include: {
      workspace: { select: { id: true } },
      role: { select: { id: true } },
    },
  });
  if (!rules.length) return 0;

  const result = await prisma.membership.createMany({
    data: rules.map((rule) => ({
      userId: user.id,
      email: user.email.toLowerCase(),
      workspaceId: rule.workspaceId,
      role: 'member',
      roleId: rule.roleId,
    })),
    skipDuplicates: true,
  });
  return result.count;
}
