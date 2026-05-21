import { DEFAULT_LOGO_SRC, defaultBusiness, defaultLabels, defaultLayout, defaultSections, getTemplateVariant, sharedDocumentDefaults, templates } from './config.js?v=20260522-f4';
import { createDocumentId, normalizeSchemaFields } from './schema.js?v=20260522-f4';
import { createDefaultTeam, normalizeTeamMember } from './team.js?v=20260522-f4';
import { cloneData } from './utils.js?v=20260522-f4';

const store = {
  current: createState('invoice'),
};

export function getState() {
  return store.current;
}

export function setState(nextState) {
  store.current = normalizeImportedState(nextState);
  return store.current;
}

export function createState(type, previousState = {}, variantId = '') {
  const template = cloneData(templates[type] || templates.invoice);
  const variant = cloneData(getTemplateVariant(template.type, variantId || previousState.variantId));
  const variantData = cloneData(variant.data || {});
  const previousBusiness = previousState.business || defaultBusiness;
  const previousLayout = previousState.layout || defaultLayout;
  const previousTeam = Array.isArray(previousState.team) ? previousState.team.map(normalizeTeamMember) : createDefaultTeam();

  return normalizeSchemaFields({
    ...sharedDocumentDefaults,
    ...template,
    ...variantData,
    type: template.type,
    variantId: variant.id,
    business: { ...cloneData(defaultBusiness), ...cloneData(previousBusiness) },
    team: previousTeam,
    labels: { ...cloneData(defaultLabels), ...cloneData(template.labels || {}), ...cloneData(variantData.labels || {}) },
    sections: { ...cloneData(defaultSections), ...cloneData(previousState.sections || {}) },
    layout: { ...cloneData(defaultLayout), ...cloneData(previousLayout) },
    logoSrc: previousState.logoSrc || sharedDocumentDefaults.logoSrc,
    signatureSrc: previousState.signatureSrc || sharedDocumentDefaults.signatureSrc,
    watermarkSrc: previousState.watermarkSrc || sharedDocumentDefaults.watermarkSrc,
  });
}

export function applyTemplate(type, variantId = '') {
  store.current = createState(type, store.current, variantId);
  return store.current;
}

export function applyTemplateVariant(variantId) {
  store.current = createState(store.current.type || 'invoice', store.current, variantId);
  return store.current;
}

export function resetCurrentTemplate() {
  return applyTemplate(store.current.type || 'invoice');
}

export function duplicateCurrentDocument() {
  const duplicate = cloneData(store.current);
  duplicate.documentId = createDocumentId();
  duplicate.number = `${duplicate.number || 'DRAFT'}-COPY`;
  duplicate.reference = duplicate.reference || `Copied from ${store.current.number || 'previous document'}`;
  store.current = normalizeImportedState(duplicate);
  return store.current;
}

export function normalizeImportedState(importedState = {}) {
  const baseType = importedState.type && templates[importedState.type] ? importedState.type : 'invoice';
  const baseState = createState(baseType, store.current || {});
  const nextState = {
    ...baseState,
    ...cloneData(importedState),
    business: { ...cloneData(defaultBusiness), ...cloneData(importedState.business || {}) },
    labels: { ...cloneData(defaultLabels), ...cloneData(baseState.labels || {}), ...cloneData(importedState.labels || {}) },
    sections: { ...cloneData(defaultSections), ...cloneData(importedState.sections || {}) },
    layout: { ...cloneData(defaultLayout), ...cloneData(importedState.layout || {}) },
    team: Array.isArray(importedState.team) && importedState.team.length ? importedState.team.map(normalizeTeamMember) : createDefaultTeam(),
    items: Array.isArray(importedState.items) && importedState.items.length ? importedState.items.map(normalizeItem) : baseState.items,
    logoSrc: importedState.logoSrc || DEFAULT_LOGO_SRC,
    signatureSrc: importedState.signatureSrc || '',
    watermarkSrc: importedState.watermarkSrc || DEFAULT_LOGO_SRC,
  };

  return normalizeSchemaFields(normalizeNumberFields(nextState));
}

export function normalizeItem(item = {}) {
  return {
    category: item.category || '',
    title: item.title || item.description || 'New item',
    name: item.name || '',
    description: item.description || '',
    quantity: Number(item.quantity) || 0,
    unit: item.unit || 'item',
    unitPrice: Number(item.unitPrice) || 0,
    discount: Number(item.discount) || 0,
    notes: item.notes || '',
  };
}

export function createBlankItem() {
  return normalizeItem({
    category: 'Service',
    title: 'New service or item',
    name: 'Item name',
    description: 'Describe the service, product, or request.',
    quantity: 1,
    unit: 'item',
    unitPrice: 0,
    discount: 0,
    notes: '',
  });
}

function normalizeNumberFields(state) {
  const numericFields = [
    'discount',
    'taxRate',
    'amountPaid',
    'extraCharge',
    'logoWidth',
    'logoMaxHeight',
    'signatureWidth',
    'watermarkWidth',
    'watermarkOpacity',
    'fontScale',
    'pagePadding',
  ];

  numericFields.forEach((fieldName) => {
    state[fieldName] = Number(state[fieldName] ?? sharedDocumentDefaults[fieldName] ?? 0);
  });

  state.items = state.items.map(normalizeItem);
  state.showSignature = Boolean(state.showSignature);
  state.showWatermark = Boolean(state.showWatermark);
  state.sectionOrder = Array.isArray(state.sectionOrder) && state.sectionOrder.length ? state.sectionOrder : sharedDocumentDefaults.sectionOrder;
  return state;
}
