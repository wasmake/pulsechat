export const SUPER_ADMIN_PERMISSION = 'pulsechat:super-admin';

export const getAuthyPermissions = (user: unknown): string[] => {
  if (!user || typeof user !== 'object') return [];
  const stored = (user as { authyPermissions?: unknown }).authyPermissions;
  if (Array.isArray(stored)) {
    return stored.filter((permission): permission is string =>
      Boolean(typeof permission === 'string' && permission)
    );
  }
  if (typeof stored !== 'string') return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((permission): permission is string =>
          Boolean(typeof permission === 'string' && permission)
        )
      : [];
  } catch {
    return [];
  }
};

export const isSuperAdmin = (user: unknown) =>
  getAuthyPermissions(user).includes(SUPER_ADMIN_PERMISSION);
