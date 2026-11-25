import { randomUUID } from 'node:crypto';
import { SITE_FIELDS, siteImageUrl } from '../js/site-content.js';
import { requireValue } from './portal-access.js';

export const publicSiteId = value => typeof value === 'string' && /^[a-f0-9-]{36}$/.test(value);

function validateFields(values, allowed) {
  requireValue(values && typeof values === 'object' && !Array.isArray(values), 'Enter website content.');
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    requireValue(allowed.includes(key) && typeof value === 'string' && value.length <= SITE_FIELDS[key][0],
      'A field is unavailable or exceeds its limit.');
    const trimmed = value.trim();
    const safe = key.endsWith('Url') && trimmed ? siteImageUrl(trimmed) : trimmed;
    requireValue(!trimmed || safe && safe.length <= SITE_FIELDS[key][0], 'Use an HTTPS image URL.');
    return [key, safe];
  }));
}

export async function websiteEditor(db, actor, uid, body) {
  const ref = db.doc('portalWebsiteEditors/' + uid);
  if (body.action === 'editor-read') {
    const snapshot = await ref.get();
    if (!snapshot.exists) return { editor: null, history: [] };
    const history = await ref.collection('versions').orderBy('revision', 'desc').limit(30).get();
    return {
      editor: snapshot.data(),
      history: history.docs.map(doc => {
        const { revision, submittedAt, publishedAt } = doc.data();
        return { revision, submittedAt, publishedAt };
      })
    };
  }

  await db.runTransaction(async tx => {
    // Recheck both roles inside the write transaction so role changes invalidate a stale request.
    const [snapshot, caller, project, client] = await Promise.all([
      tx.get(ref), tx.get(db.doc('users/' + actor.uid)),
      tx.get(db.doc('users/' + uid + '/projects/current')), tx.get(db.doc('users/' + uid))
    ]);
    requireValue(caller.data()?.role === actor.role && client.data()?.role === 'client', 'Access denied.', 403);
    requireValue(project.exists, 'Save a client project before enabling editing.', 409);
    const existing = snapshot.data();
    const state = existing || { publicId: randomUUID(), fields: [], draft: {}, revision: 0, stage: 'draft' };
    requireValue(body.rev === state.revision, 'The website changed. Reload the latest version.', 409);
    const revision = state.revision + 1;
    const next = { ...state, revision };
    const now = new Date().toISOString();
    const version = id => ref.collection('versions').doc(String(id));

    if (body.action === 'editor-config') {
      requireValue(actor.role === 'admin', 'Access denied.', 403);
      requireValue(Array.isArray(body.fields) && body.fields.every(key => Object.hasOwn(SITE_FIELDS, key))
        && new Set(body.fields).size === body.fields.length, 'Choose supported editable fields.');
      const missingFields = body.fields.filter(key => !Object.hasOwn(state.draft, key));
      next.fields = body.fields;
      next.draft = { ...state.draft, ...Object.fromEntries(missingFields.map(key => [key, ''])),
        ...validateFields(body.content, Object.keys(SITE_FIELDS)) };
      next.stage = 'draft';
    } else {
      requireValue(existing, 'Ask BAM to set up your website editor.', 409);
      switch (body.action) {
        case 'editor-save':
          requireValue(actor.role === 'client' && state.fields.length, 'Editing is unavailable.', 403);
          requireValue(!['in-review', 'approved'].includes(state.stage), 'This draft is already in review.', 409);
          next.draft = { ...state.draft, ...validateFields(body.content, state.fields) };
          next.stage = 'draft';
          break;
        case 'editor-submit':
          requireValue(actor.role === 'client' && state.fields.length, 'Editing is unavailable.', 403);
          requireValue(['draft', 'changes-requested', 'published'].includes(state.stage), 'This draft is already in review.', 409);
          next.draft = { ...state.draft, ...validateFields(body.content, state.fields) };
          requireValue(Object.values(next.draft).some(Boolean), 'Add website content before submitting.');
          next.stage = 'in-review';
          next.submittedRevision = revision;
          tx.create(version(revision), { content: next.draft, revision, submittedAt: now, submittedBy: actor.uid });
          break;
        case 'editor-approve':
        case 'editor-return':
          requireValue(actor.role === 'admin', 'Access denied.', 403);
          requireValue(state.stage === 'in-review', 'This version is no longer in review.', 409);
          next.stage = body.action === 'editor-approve' ? 'approved' : 'changes-requested';
          break;
        case 'editor-publish': {
          requireValue(actor.role === 'admin', 'Access denied.', 403);
          requireValue(state.stage === 'approved', 'Approve this version before publishing.', 409);
          const published = await tx.get(version(state.submittedRevision));
          requireValue(published.exists, 'Version unavailable.', 409);
          next.stage = 'published';
          next.publishedRevision = state.submittedRevision;
          tx.update(published.ref, { publishedAt: now, publishedBy: actor.uid });
          tx.set(db.doc('portalPublishedSites/' + state.publicId), { content: published.data().content });
          break;
        }
        case 'editor-restore': {
          requireValue(actor.role === 'admin', 'Access denied.', 403);
          requireValue(Number.isSafeInteger(body.version) && body.version > 0, 'Select a version.');
          const historical = await tx.get(version(body.version));
          requireValue(historical.exists, 'Version unavailable.', 404);
          next.draft = validateFields(historical.data().content, Object.keys(SITE_FIELDS));
          next.stage = 'in-review';
          next.submittedRevision = revision;
          tx.create(version(revision), { content: next.draft, revision, submittedAt: now, submittedBy: actor.uid });
          break;
        }
        default:
          requireValue(false, 'Unknown website action.');
      }
    }
    tx.set(ref, next);
  });
  return { saved: true };
}
