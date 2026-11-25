export class PortalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireValue(condition, message, status = 400) {
  if (!condition) throw new PortalError(status, message);
}

const validUid = value => typeof value === 'string' && /^[^/\x00-\x1f]{1,128}$/.test(value)
  && !['.', '..'].includes(value) && !/^__.*__$/.test(value);

export async function portalActor(req, auth, db) {
  const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
  requireValue(token, 'Sign in to continue.', 401);
  let identity;
  try {
    identity = await auth.verifyIdToken(token, true);
  } catch {
    throw new PortalError(401, 'Sign in again to continue.');
  }
  requireValue(identity.email_verified === true && validUid(identity.uid), 'Verify your email to continue.', 403);
  const profile = await db.doc('users/' + identity.uid).get();
  const role = profile.data()?.role;
  requireValue(role === 'client' || role === 'admin', 'Access denied.', 403);
  return { uid: identity.uid, role };
}

export async function portalTenant(db, actor, requestedUid) {
  if (actor.role === 'client') {
    requireValue(requestedUid === undefined || requestedUid === actor.uid, 'Access denied.', 403);
    return actor.uid;
  }
  requireValue(actor.role === 'admin', 'Access denied.', 403);
  requireValue(validUid(requestedUid), 'Select a client.');
  const profile = await db.doc('users/' + requestedUid).get();
  requireValue(profile.data()?.role === 'client', 'Client unavailable.', 404);
  return requestedUid;
}
