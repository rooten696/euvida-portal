export const ADMIN_EMAIL = 'rooten@seznam.cz';

type AdminUserIdentity = {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

type AdminSessionIdentity = {
  user?: AdminUserIdentity | null;
};

export function isUserAdmin(user?: AdminUserIdentity | null): boolean {
  if (!user) return false;

  const appMetadata = user.app_metadata ?? {};
  const hasAdminRole = appMetadata.role === 'admin' || appMetadata.is_admin === true;
  const normalizedEmail = user.email?.trim().toLowerCase();

  return hasAdminRole && normalizedEmail === ADMIN_EMAIL;
}

export async function loadAdminDataForSession(
  session: AdminSessionIdentity | null | undefined,
  loaders: Array<() => Promise<unknown>>,
): Promise<boolean> {
  if (!isUserAdmin(session?.user)) return false;

  await Promise.all(loaders.map((load) => load()));
  return true;
}
