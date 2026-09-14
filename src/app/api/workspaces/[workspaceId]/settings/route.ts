import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getWorkspaceAccess,
  WorkspacePermission,
  workspacePermissionKeys,
} from '@/lib/workspace-access';

const publicEmailDomains = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
]);

const error = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

async function authorize(request: Request, workspaceId: string) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { response: error('Authentication required', 401) };
  const access = await getWorkspaceAccess(workspaceId, session.user);
  if (!access?.isMember && !access?.isGlobalAdmin) {
    return { response: error('Access denied', 403) };
  }
  return { session, access };
}

function hasPermission(
  access: NonNullable<Awaited<ReturnType<typeof getWorkspaceAccess>>>,
  permission: WorkspacePermission
) {
  return access.can(permission);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const workspaceId = (await params).workspaceId;
  const authorization = await authorize(request, workspaceId);
  if ('response' in authorization) return authorization.response;
  const { access } = authorization;
  if (!access.permissions.size) return error('Access denied', 403);

  const [roles, links, domains, memberships] = await Promise.all([
    prisma.workspaceRole.findMany({
      where: { workspaceId },
      orderBy: [{ position: 'desc' }, { name: 'asc' }],
    }),
    prisma.workspaceInviteLink.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.workspaceDomainRule.findMany({
      where: { workspaceId },
      orderBy: { domain: 'asc' },
    }),
    prisma.membership.findMany({
      where: { workspaceId },
      orderBy: { joinedAt: 'asc' },
    }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: memberships.map((item) => item.userId) } },
    select: { id: true, name: true, email: true, image: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  return NextResponse.json({
    permissions: Array.from(access.permissions),
    isOwner: access.isOwner,
    roles: roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions) as string[],
    })),
    inviteLinks: links,
    domains,
    members: memberships.map((membership) => ({
      ...membership,
      isOwner: membership.userId === access.workspace.ownerId,
      user: usersById.get(membership.userId) || {
        id: membership.userId,
        name: membership.email,
        email: membership.email,
        image: null,
      },
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const workspaceId = (await params).workspaceId;
  const authorization = await authorize(request, workspaceId);
  if ('response' in authorization) return authorization.response;
  const { access, session } = authorization;
  const unrestricted = access.isOwner || access.isGlobalAdmin;
  const actorPosition =
    access.membership?.workspaceRole?.position ||
    (access.membership?.role?.toLowerCase() === 'admin' ? 100 : 0);
  const canAssignRole = (role: { position: number }) =>
    unrestricted || role.position < actorPosition;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== 'string') return error('Invalid request');

  if (body.action === 'create_invite') {
    if (!hasPermission(access, 'manage_invites'))
      return error('Access denied', 403);
    const maxUses = body.maxUses === null ? null : Number(body.maxUses);
    if (
      maxUses !== null &&
      (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000)
    ) {
      return error('Claim limit must be between 1 and 100,000');
    }
    const expiryHours =
      body.expiryHours === null ? null : Number(body.expiryHours);
    if (
      expiryHours !== null &&
      (!Number.isInteger(expiryHours) || expiryHours < 1 || expiryHours > 8760)
    ) {
      return error('Expiry must be between 1 hour and 1 year');
    }
    let roleId = typeof body.roleId === 'string' ? body.roleId : null;
    if (roleId) {
      const role = await prisma.workspaceRole.findFirst({
        where: { id: roleId, workspaceId },
      });
      if (!role) return error('Invalid role');
      if (!canAssignRole(role))
        return error('You cannot assign a role at or above your own', 403);
    }
    if (!roleId) {
      roleId =
        (
          await prisma.workspaceRole.findFirst({
            where: { workspaceId, isDefault: true },
            select: { id: true },
          })
        )?.id || null;
    }
    const invite = await prisma.workspaceInviteLink.create({
      data: {
        token: randomBytes(18).toString('base64url'),
        workspaceId,
        createdById: session.user.id,
        roleId,
        maxUses,
        expiresAt:
          expiryHours === null
            ? null
            : new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      },
    });
    return NextResponse.json({ invite });
  }

  if (body.action === 'revoke_invite') {
    if (!hasPermission(access, 'manage_invites'))
      return error('Access denied', 403);
    await prisma.workspaceInviteLink.updateMany({
      where: { id: String(body.inviteId || ''), workspaceId },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'create_domain') {
    if (!hasPermission(access, 'manage_workspace'))
      return error('Access denied', 403);
    const domain = String(body.domain || '')
      .trim()
      .toLowerCase()
      .replace(/^@/, '');
    if (
      !/^(?=.{3,191}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
        domain
      )
    ) {
      return error('Enter a valid email domain');
    }
    if (publicEmailDomains.has(domain))
      return error('Public email domains cannot be used');
    const ownDomain = session.user.email.split('@')[1]?.toLowerCase();
    if (!access.isGlobalAdmin && (!access.isOwner || ownDomain !== domain)) {
      return error(
        'Only an owner with a matching verified email domain can enable auto-join',
        403
      );
    }
    let roleId = typeof body.roleId === 'string' ? body.roleId : null;
    if (roleId) {
      const role = await prisma.workspaceRole.findFirst({
        where: { id: roleId, workspaceId },
      });
      if (!role) return error('Invalid role');
      if (!canAssignRole(role))
        return error('You cannot assign a role at or above your own', 403);
    }
    if (!roleId) {
      roleId =
        (
          await prisma.workspaceRole.findFirst({
            where: { workspaceId, isDefault: true },
            select: { id: true },
          })
        )?.id || null;
    }
    const rule = await prisma.workspaceDomainRule.upsert({
      where: { workspaceId_domain: { workspaceId, domain } },
      update: { roleId },
      create: { workspaceId, domain, roleId },
    });
    return NextResponse.json({ rule });
  }

  if (body.action === 'delete_domain') {
    if (!hasPermission(access, 'manage_workspace'))
      return error('Access denied', 403);
    await prisma.workspaceDomainRule.deleteMany({
      where: { id: String(body.domainId || ''), workspaceId },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'save_role') {
    if (!hasPermission(access, 'manage_roles'))
      return error('Access denied', 403);
    const roleId = typeof body.roleId === 'string' ? body.roleId : '';
    const name = String(body.name || '').trim();
    const color = String(body.color || '').toLowerCase();
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.filter((item: unknown): item is WorkspacePermission =>
          workspacePermissionKeys.includes(item as WorkspacePermission)
        )
      : [];
    if (!name || name.length > 40)
      return error('Role name must be between 1 and 40 characters');
    if (!/^#[0-9a-f]{6}$/.test(color)) return error('Invalid role color');
    if (roleId) {
      const existing = await prisma.workspaceRole.findFirst({
        where: { id: roleId, workspaceId },
      });
      if (!existing) return error('Role not found', 404);
      if (existing.isManaged) return error('Built-in roles cannot be edited');
      if (!canAssignRole(existing))
        return error('You cannot edit a role at or above your own', 403);
      const role = await prisma.workspaceRole.update({
        where: { id: roleId },
        data: { name, color, permissions: JSON.stringify(permissions) },
      });
      return NextResponse.json({ role });
    }
    const highest = await prisma.workspaceRole.aggregate({
      where: { workspaceId, isManaged: false },
      _max: { position: true },
    });
    const nextPosition = Math.min(
      (highest._max.position || 0) + 1,
      unrestricted ? 99 : actorPosition - 1
    );
    if (nextPosition < 1)
      return error('Your role cannot create another role', 403);
    const role = await prisma.workspaceRole.create({
      data: {
        workspaceId,
        name,
        color,
        permissions: JSON.stringify(permissions),
        position: nextPosition,
      },
    });
    return NextResponse.json({ role });
  }

  if (body.action === 'delete_role') {
    if (!hasPermission(access, 'manage_roles'))
      return error('Access denied', 403);
    const roleId = String(body.roleId || '');
    const role = await prisma.workspaceRole.findFirst({
      where: { id: roleId, workspaceId },
    });
    if (!role) return error('Role not found', 404);
    if (role.isManaged) return error('Built-in roles cannot be deleted');
    if (!canAssignRole(role))
      return error('You cannot delete a role at or above your own', 403);
    const fallback = await prisma.workspaceRole.findFirst({
      where: { workspaceId, isDefault: true },
    });
    await prisma.$transaction([
      prisma.membership.updateMany({
        where: { workspaceId, roleId },
        data: { roleId: fallback?.id || null, role: 'member' },
      }),
      prisma.workspaceInviteLink.updateMany({
        where: { workspaceId, roleId },
        data: { roleId: fallback?.id || null },
      }),
      prisma.workspaceDomainRule.updateMany({
        where: { workspaceId, roleId },
        data: { roleId: fallback?.id || null },
      }),
      prisma.workspaceRole.delete({ where: { id: roleId } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'set_member_role') {
    if (!hasPermission(access, 'manage_members'))
      return error('Access denied', 403);
    const userId = String(body.userId || '');
    if (userId === access.workspace.ownerId)
      return error("The owner's role cannot be changed");
    const role = await prisma.workspaceRole.findFirst({
      where: { id: String(body.roleId || ''), workspaceId },
    });
    if (!role) return error('Role not found');
    if (!canAssignRole(role))
      return error('You cannot assign a role at or above your own', 403);
    await prisma.membership.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: {
        roleId: role.id,
        role: role.name === 'Admin' && role.isManaged ? 'admin' : 'member',
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'remove_member') {
    if (!hasPermission(access, 'manage_members'))
      return error('Access denied', 403);
    const userId = String(body.userId || '');
    if (userId === access.workspace.ownerId)
      return error('The owner cannot be removed');
    const target = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      include: { workspaceRole: true },
    });
    if (target?.workspaceRole && !canAssignRole(target.workspaceRole)) {
      return error(
        'You cannot remove a member with a role at or above your own',
        403
      );
    }
    await prisma.membership.deleteMany({ where: { userId, workspaceId } });
    return NextResponse.json({ ok: true });
  }

  return error('Unknown action');
}
