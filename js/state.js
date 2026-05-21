import { DEFAULT_LOGO_SRC, defaultBusiness, defaultLabels, defaultLayout, defaultSections, sharedDocumentDefaults, templates } from './config.js';
import { createDefaultTeam, normalizeTeamMember } from './team.js';
import { cloneData } from './utils.js';

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

export function createState(type, previousState = {}) {
  const template = cloneData(templates[type] || templates.invoice);
  const previousBusiness = previousState.business || defaultBusiness;
  const previousLayout = previousState.layout || defaultLayout;
  const previousTeam = Array.isArray(previousState.team) ? previousState.team.map(normalizeTeamMember) : createDefaultTeam();

  return {
    ...sharedDocumentDefaults,
    ...template,
    business: { ...cloneData(defaultBusiness), ...cloneData(previousBusiness) },
    team: previousTeam,
    labels: { ...cloneData(defaultLabels), ...cloneData(template.labels || {}) },
    sections: { ...cloneData(defaultSections), ...cloneData(previousState.sections || {}) },
    layout: { ...cloneData(defaultLayout), ...cloneData(previousLayout) },
    logoSrc: previousState.logoSrc || sharedDocumentDefaults.logoSrc,
    signatureSrc: previousState.signatureSrc || sharedDocumentDefaults.signatureSrc,
    watermarkSrc: previousState.watermarkSrc || sharedDocumentDefaults.watermarkSrc,
  };
}

export function applyTemplate(type) {
  store.current = createState(type, store.current);
  return store.current;
}

export function resetCurrentTemplate() {
  return applyTemplate(store.current.type || 'invoice');
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

  return normalizeNumberFields(nextState);
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
  return state;
}
