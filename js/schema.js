export const SCHEMA_VERSION = 2;
export const EXPORT_COMPAT_VERSION = 2;
export const EXPORT_KIND = 'breezing-studio-document';

export function createDocumentId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeSchemaFields(state) {
  const now = new Date().toISOString();
  state.schemaVersion = Number(state.schemaVersion) || SCHEMA_VERSION;
  state.compatVersion = Number(state.compatVersion) || EXPORT_COMPAT_VERSION;
  state.documentId = state.documentId || createDocumentId();
  state.createdAt = state.createdAt || now;
  state.updatedAt = now;
  state.variantId = state.variantId || `${state.type || 'invoice'}-classic`;
  state.brandThemeId = state.brandThemeId || 'classic-gold';
  state.logoPresetId = state.logoPresetId || 'primary-logo';
  state.fontPresetId = state.fontPresetId || 'arial-system';
  state.studioPresetId = state.studioPresetId || 'breezing-core';
  state.locale = state.locale || 'en-MW';
  state.taxLabel = state.taxLabel || 'Tax / VAT';
  state.taxNumber = state.taxNumber || '';
  state.sectionOrder = Array.isArray(state.sectionOrder) && state.sectionOrder.length
    ? state.sectionOrder
    : ['intro', 'cards', 'team', 'items', 'notes', 'signature'];
  return state;
}

export function validateDocument(state) {
  const errors = [];
  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['Document is not an object'] };
  }
  if (!state.type) {
    errors.push('Missing document type');
  }
  if (!state.title) {
    errors.push('Missing document title');
  }
  if (!state.number) {
    errors.push('Missing document number');
  }
  if (!Array.isArray(state.items)) {
    errors.push('Line items must be an array');
  }
  if (!state.business || typeof state.business !== 'object') {
    errors.push('Business details are missing');
  }
  return { valid: errors.length === 0, errors };
}

export function createExportEnvelope(state) {
  return {
    kind: EXPORT_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportCompatibilityVersion: EXPORT_COMPAT_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'Breezing Pictures Studio Manager',
    document: state,
  };
}

export function unwrapExportPayload(payload) {
  if (payload?.kind === EXPORT_KIND && payload.document) {
    return payload.document;
  }
  return payload;
}
