import { DEFAULT_LOGO_SRC, STORAGE_KEY, brandThemes, fontPresets, getTemplateVariant, logoPresets, studioPresets, templateVariants } from './config.js?v=20260522-autosave-settings';
import { applyTemplate, applyTemplateVariant, createBlankItem, duplicateCurrentDocument, getState, resetCurrentTemplate, setState } from './state.js?v=20260522-autosave-settings';
import { handleExport } from './exporter.js?v=20260522-autosave-settings';
import { renderDocumentCanvas } from './canvas-renderer.js?v=20260522-autosave-settings';
import { renderPreview } from './preview.js?v=20260522-autosave-settings';
import { createExportEnvelope, unwrapExportPayload, validateDocument } from './schema.js?v=20260522-autosave-settings';
import { getAutosaveIntervalMs, getSettingsSummary, loadSettings, normalizeSettings, resetSettings as resetStoredSettings, saveSettings } from './settings.js?v=20260522-autosave-settings';
import { getNextDocumentNumber, isIndexedDbAvailable, listVersions, loadDraft, loadVersion, saveDraft, saveVersion } from './storage.js?v=20260522-autosave-settings';
import { createBlankTeamMember, renderTeamEditorHtml } from './team.js?v=20260522-autosave-settings';
import { calculateTotals, cloneData, escapeHtml, fileToDataUrl, formatMoney, getFileBaseName, getItemTotal } from './utils.js?v=20260522-autosave-settings';

const numericFields = new Set([
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
]);
const checkboxFields = new Set(['showSignature', 'showWatermark']);
const itemNumberFields = new Set(['quantity', 'unitPrice', 'discount']);
const sectionLabels = {
  intro: 'Intro message',
  cards: 'Client and business cards',
  team: 'Production team',
  items: 'Line items table',
  notes: 'Notes and payment',
  signature: 'Signature block',
};
const commandItems = [
  { action: 'generate-number', label: 'Generate next document number', hint: 'Numbering' },
  { action: 'save-version', label: 'Save recoverable version', hint: 'Recovery' },
  { action: 'restore-latest-draft', label: 'Restore latest autosaved draft', hint: 'Recovery' },
  { action: 'open-autosave-modal', label: 'Open autosaved sessions', hint: 'Recovery' },
  { action: 'open-settings-modal', label: 'Open settings', hint: 'Preferences' },
  { action: 'undo', label: 'Undo last edit', hint: 'History' },
  { action: 'redo', label: 'Redo edit', hint: 'History' },
  { action: 'toggle-dark-mode', label: 'Toggle dark mode', hint: 'Appearance' },
  { action: 'duplicate-template', label: 'Duplicate current document template', hint: 'Templates' },
  { action: 'open-export-modal', label: 'Open export center', hint: 'Export' },
  { action: 'print', label: 'Print current document', hint: 'Print' },
];

let elements = {};
let appSettings = loadSettings();
let statusTimeoutId = 0;
let renderFrameId = 0;
let lastFocusedElement = null;
let autosaveTimeoutId = 0;
let readyForAutosave = false;
let autosaveDirty = false;
let pendingAutosaveReason = 'Auto-save';
let lastSavedSignature = '';
let cachedVersions = [];
let undoStack = [];
let redoStack = [];
let historyLocked = false;

export async function initUi() {
  appSettings = loadSettings();
  elements = collectElements();
  populatePresetControls();
  await recoverDraft();
  loadSavedLayout();
  syncControls();
  syncSettingsControls();
  renderItemsEditor();
  renderTeamEditor();
  renderSectionOrder();
  renderCommandList();
  renderAll();
  bindEvents();
  exposeTestingApi();
  readyForAutosave = true;
  lastSavedSignature = createAutosaveSignature();
  await refreshVersionList();
  setAutosaveStatus(getAutosaveReadyMessage());
}

function collectElements() {
  return {
    documentPreview: document.querySelector('[data-document-preview]'),
    itemsEditor: document.querySelector('[data-items-editor]'),
    teamEditor: document.querySelector('[data-team-editor]'),
    statusMessage: document.querySelector('[data-status-message]'),
    importJsonInput: document.querySelector('[data-import-json]'),
    exportModal: document.querySelector('[data-export-modal]'),
    autosaveModal: document.querySelector('[data-autosave-modal]'),
    settingsModal: document.querySelector('[data-settings-modal]'),
    commandPalette: document.querySelector('[data-command-palette]'),
    commandSearch: document.querySelector('[data-command-search]'),
    commandList: document.querySelector('[data-command-list]'),
    exportFileName: document.querySelector('[data-export-option="fileName"]'),
    autosaveStatusElements: Array.from(document.querySelectorAll('[data-autosave-status]')),
    autosaveMeta: document.querySelector('[data-autosave-meta]'),
    settingsSummary: document.querySelector('[data-settings-summary]'),
    settingsControls: Array.from(document.querySelectorAll('[data-setting-field]')),
    versionList: document.querySelector('[data-version-list]'),
    analyticsDashboard: document.querySelector('[data-analytics-dashboard]'),
    templateVariant: document.querySelector('[data-template-variant]'),
    brandTheme: document.querySelector('[data-brand-theme]'),
    logoPreset: document.querySelector('[data-logo-preset]'),
    fontPreset: document.querySelector('[data-font-preset]'),
    studioPreset: document.querySelector('[data-studio-preset]'),
    sectionOrder: document.querySelector('[data-section-order]'),
    fieldControls: Array.from(document.querySelectorAll('[data-field]')),
    businessControls: Array.from(document.querySelectorAll('[data-business-field]')),
    labelControls: Array.from(document.querySelectorAll('[data-label-field]')),
    sectionControls: Array.from(document.querySelectorAll('[data-section-field]')),
    layoutControls: Array.from(document.querySelectorAll('[data-layout-field]')),
    templateButtons: Array.from(document.querySelectorAll('[data-template]')),
    imageInputs: Array.from(document.querySelectorAll('[data-image-input]')),
  };
}

function bindEvents() {
  elements.fieldControls.forEach((control) => {
    control.addEventListener('input', () => updateField(control));
    control.addEventListener('change', () => updateField(control));
    if (control instanceof HTMLInputElement && control.type === 'number') {
      control.inputMode = 'decimal';
    }
  });

  elements.businessControls.forEach((control) => {
    control.addEventListener('input', () => updateNestedField('business', control.dataset.businessField, control.value));
  });

  elements.labelControls.forEach((control) => {
    control.addEventListener('input', () => updateNestedField('labels', control.dataset.labelField, control.value));
  });

  elements.sectionControls.forEach((control) => {
    control.addEventListener('change', () => updateSectionField(control.dataset.sectionField, control.checked));
  });

  elements.layoutControls.forEach((control) => {
    control.addEventListener('change', () => updateLayoutField(control));
  });

  elements.settingsControls.forEach((control) => {
    control.addEventListener('change', () => updateSettingField(control));
    control.addEventListener('input', () => updateSettingField(control));
  });

  elements.templateVariant?.addEventListener('change', () => {
    pushUndoSnapshot();
    applyTemplateVariant(elements.templateVariant.value);
    syncEverything();
    setStatus('Template style applied');
  });

  elements.brandTheme?.addEventListener('change', () => applyBrandTheme(elements.brandTheme.value));
  elements.logoPreset?.addEventListener('change', () => applyLogoPreset(elements.logoPreset.value));
  elements.fontPreset?.addEventListener('change', () => applyFontPreset(elements.fontPreset.value));
  elements.studioPreset?.addEventListener('change', () => applyStudioPreset(elements.studioPreset.value));
  elements.commandSearch?.addEventListener('input', () => renderCommandList(elements.commandSearch.value));

  elements.templateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      pushUndoSnapshot();
      applyTemplate(button.dataset.template);
      syncEverything();
      setStatus(`${getState().title} template loaded`);
    });
  });

  elements.imageInputs.forEach((input) => {
    input.addEventListener('change', () => handleImageInput(input));
  });

  if (elements.itemsEditor) {
    elements.itemsEditor.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        handleItemInput(event.target);
      }
    });

    elements.itemsEditor.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="remove-item"]');
      if (button) {
        const itemRow = button.closest('[data-item-row]');
        removeItem(Number(itemRow.dataset.itemRow));
      }
    });
  }

  if (elements.teamEditor) {
    elements.teamEditor.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        handleTeamInput(event.target);
      }
    });

    elements.teamEditor.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="remove-team-member"]');
      if (button) {
        const teamRow = button.closest('[data-team-row]');
        removeTeamMember(Number(teamRow.dataset.teamRow));
      }
    });
  }

  if (elements.sectionOrder) {
    elements.sectionOrder.addEventListener('dragstart', (event) => {
      const item = event.target.closest('[data-order-key]');
      if (item) {
        event.dataTransfer.setData('text/plain', item.dataset.orderKey);
      }
    });
    elements.sectionOrder.addEventListener('dragover', (event) => event.preventDefault());
    elements.sectionOrder.addEventListener('drop', (event) => {
      event.preventDefault();
      const sourceKey = event.dataTransfer.getData('text/plain');
      const target = event.target.closest('[data-order-key]');
      if (sourceKey && target) {
        reorderSection(sourceKey, target.dataset.orderKey);
      }
    });
  }

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    const exportButton = event.target.closest('[data-export]');
    const versionButton = event.target.closest('[data-version-id]');
    const commandButton = event.target.closest('[data-command-action]');

    if (actionButton) {
      handleAction(actionButton.dataset.action);
    }

    if (versionButton) {
      restoreVersion(versionButton.dataset.versionId);
    }

    if (commandButton) {
      closeCommandPalette();
      handleAction(commandButton.dataset.commandAction);
    }

    if (exportButton) {
      runExport({ format: exportButton.dataset.export });
    }
  });

  document.addEventListener('keydown', (event) => {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openCommandPalette();
    }
    if (modifier && event.key.toLowerCase() === 's') {
      event.preventDefault();
      manualSaveVersion('Keyboard save');
    }
    if (modifier && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      undoLastChange();
    }
    if ((modifier && event.key.toLowerCase() === 'y') || (modifier && event.shiftKey && event.key.toLowerCase() === 'z')) {
      event.preventDefault();
      redoLastChange();
    }
    if (event.key === 'Escape') {
      closeExportModal();
      closeAutosaveModal();
      closeSettingsModal();
      closeCommandPalette();
    }
    if (event.key === 'Tab') {
      trapActiveModalFocus(event);
    }
  });

  if (elements.exportModal) {
    elements.exportModal.addEventListener('click', (event) => {
      if (event.target === elements.exportModal) {
        closeExportModal();
      }
    });
  }

  if (elements.autosaveModal) {
    elements.autosaveModal.addEventListener('click', (event) => {
      if (event.target === elements.autosaveModal) {
        closeAutosaveModal();
      }
    });
  }

  if (elements.settingsModal) {
    elements.settingsModal.addEventListener('click', (event) => {
      if (event.target === elements.settingsModal) {
        closeSettingsModal();
      }
    });
  }

  if (elements.commandPalette) {
    elements.commandPalette.addEventListener('click', (event) => {
      if (event.target === elements.commandPalette) {
        closeCommandPalette();
      }
    });
  }

  if (elements.importJsonInput) {
    elements.importJsonInput.addEventListener('change', () => {
      const file = elements.importJsonInput.files && elements.importJsonInput.files[0];
      if (!file) {
        return;
      }
      importJson(file).finally(() => {
        elements.importJsonInput.value = '';
      });
    });
  }
}

function handleAction(action) {
  if (action === 'add-item') {
    addItem();
  }
  if (action === 'add-team-member') {
    addTeamMember();
  }
  if (action === 'reset-logo') {
    resetLogo();
  }
  if (action === 'reset-template') {
    pushUndoSnapshot();
    resetCurrentTemplate();
    syncEverything();
    setStatus('New document created');
  }
  if (action === 'generate-number') {
    generateDocumentNumber();
  }
  if (action === 'save-version') {
    manualSaveVersion('Manual version');
  }
  if (action === 'restore-latest-draft') {
    restoreLatestDraft();
  }
  if (action === 'open-autosave-modal') {
    openAutosaveModal();
  }
  if (action === 'close-autosave-modal') {
    closeAutosaveModal();
  }
  if (action === 'open-settings-modal') {
    openSettingsModal();
  }
  if (action === 'close-settings-modal') {
    closeSettingsModal();
  }
  if (action === 'save-settings') {
    persistSettings('Settings saved');
  }
  if (action === 'reset-settings') {
    resetSettingsToDefaults();
  }
  if (action === 'duplicate-template') {
    pushUndoSnapshot();
    duplicateCurrentDocument();
    syncEverything();
    setStatus('Template duplicated');
  }
  if (action === 'undo') {
    undoLastChange();
  }
  if (action === 'redo') {
    redoLastChange();
  }
  if (action === 'toggle-dark-mode') {
    const state = getState();
    pushUndoSnapshot();
    state.layout.darkMode = !state.layout.darkMode;
    syncControls();
    applyLayout(state.layout);
    saveLayout(state.layout);
    setStatus(state.layout.darkMode ? 'Dark mode enabled' : 'Dark mode disabled');
  }
  if (action === 'open-command-palette') {
    openCommandPalette();
  }
  if (action === 'close-command-palette') {
    closeCommandPalette();
  }
  if (action === 'toggle-panel') {
    togglePanel();
  }
  if (action === 'open-export-modal') {
    openExportModal();
  }
  if (action === 'close-export-modal') {
    closeExportModal();
  }
  if (action === 'run-export') {
    runExport(collectExportOptions());
  }
  if (action === 'print') {
    window.print();
  }
}

function updateField(control) {
  const state = getState();
  const fieldName = control.dataset.field;
  if (!fieldName) {
    return;
  }

  pushUndoSnapshot();
  if (checkboxFields.has(fieldName)) {
    state[fieldName] = control.checked;
  } else if (numericFields.has(fieldName)) {
    state[fieldName] = Number(control.value) || 0;
  } else {
    state[fieldName] = control.value;
  }

  scheduleRender();
}

function updateNestedField(groupName, fieldName, value) {
  const state = getState();
  if (!state[groupName] || !fieldName) {
    return;
  }
  pushUndoSnapshot();
  state[groupName][fieldName] = value;
  scheduleRender();
}

function updateSectionField(fieldName, checked) {
  const state = getState();
  pushUndoSnapshot();
  state.sections[fieldName] = checked;
  scheduleRender();
}

function updateLayoutField(control) {
  const state = getState();
  const fieldName = control.dataset.layoutField;
  if (!fieldName) {
    return;
  }

  state.layout[fieldName] = control.type === 'checkbox' ? control.checked : control.value;
  scheduleAutosave('Layout updated');
  applyLayout(state.layout);
  saveLayout(state.layout);
}

function updateSettingField(control) {
  const fieldName = control.dataset.settingField;
  if (!fieldName) {
    return;
  }
  const value = control.type === 'checkbox' ? control.checked : control.value;
  appSettings = normalizeSettings({ ...appSettings, [fieldName]: value });
  persistSettings('Settings updated', { quiet: true });
}

function syncSettingsControls() {
  elements.settingsControls.forEach((control) => {
    const fieldName = control.dataset.settingField;
    if (!fieldName) {
      return;
    }
    if (control.type === 'checkbox') {
      control.checked = Boolean(appSettings[fieldName]);
      return;
    }
    control.value = String(appSettings[fieldName] ?? '');
  });
  renderSettingsSummary();
}

function persistSettings(message = 'Settings saved', options = {}) {
  appSettings = saveSettings(appSettings);
  syncSettingsControls();
  refreshAutosaveTimerForSettings();
  if (!options.quiet) {
    setStatus(message);
  }
}

function resetSettingsToDefaults() {
  appSettings = resetStoredSettings();
  syncSettingsControls();
  refreshAutosaveTimerForSettings();
  setStatus('Settings reset to defaults');
}

function renderSettingsSummary() {
  const summary = getSettingsSummary(appSettings);
  if (elements.settingsSummary) {
    elements.settingsSummary.textContent = summary;
  }
  if (elements.autosaveMeta) {
    elements.autosaveMeta.textContent = `${summary} Recovery sessions are stored locally in this browser.`;
  }
}

function addItem() {
  const state = getState();
  pushUndoSnapshot();
  state.items.push(createBlankItem());
  renderItemsEditor();
  flushRender();
  setStatus('Item added');
}

function removeItem(itemIndex) {
  const state = getState();
  pushUndoSnapshot();
  if (state.items.length === 1) {
    state.items[0] = createBlankItem();
  } else {
    state.items.splice(itemIndex, 1);
  }
  renderItemsEditor();
  flushRender();
  setStatus('Item removed');
}

function handleItemInput(target) {
  const itemRow = target.closest('[data-item-row]');
  if (!itemRow) {
    return;
  }

  const state = getState();
  const itemIndex = Number(itemRow.dataset.itemRow);
  const fieldName = target.dataset.itemField;
  const item = state.items[itemIndex];
  if (!item || !fieldName) {
    return;
  }

  pushUndoSnapshot();
  item[fieldName] = itemNumberFields.has(fieldName) ? Number(target.value) || 0 : target.value;
  const totalOutput = itemRow.querySelector('[data-item-total]');
  if (totalOutput) {
    totalOutput.textContent = formatMoney(getItemTotal(item), state.currency, state.locale);
  }
  scheduleRender();
}

function addTeamMember() {
  const state = getState();
  pushUndoSnapshot();
  state.team.push(createBlankTeamMember());
  renderTeamEditor();
  flushRender();
  setStatus('Team member added');
}

function removeTeamMember(memberIndex) {
  const state = getState();
  pushUndoSnapshot();
  if (state.team.length === 1) {
    state.team[0] = createBlankTeamMember();
  } else {
    state.team.splice(memberIndex, 1);
  }
  renderTeamEditor();
  flushRender();
  setStatus('Team member removed');
}

function handleTeamInput(target) {
  const teamRow = target.closest('[data-team-row]');
  if (!teamRow) {
    return;
  }

  const state = getState();
  const memberIndex = Number(teamRow.dataset.teamRow);
  const fieldName = target.dataset.teamField;
  const member = state.team[memberIndex];
  if (!member || !fieldName) {
    return;
  }

  pushUndoSnapshot();
  member[fieldName] = target.value;
  scheduleRender();
}

async function handleImageInput(input) {
  const state = getState();
  const imageType = input.dataset.imageInput;
  const file = input.files && input.files[0];
  if (!file || !imageType) {
    return;
  }

  pushUndoSnapshot();
  const dataUrl = await fileToDataUrl(file);
  if (imageType === 'logo') {
    state.logoSrc = dataUrl;
  }
  if (imageType === 'signature') {
    state.signatureSrc = dataUrl;
    state.showSignature = true;
  }
  if (imageType === 'watermark') {
    state.watermarkSrc = dataUrl;
    state.showWatermark = true;
  }
  syncControls();
  flushRender();
  setStatus(`${imageType} updated`);
}

function resetLogo() {
  const state = getState();
  pushUndoSnapshot();
  state.logoSrc = DEFAULT_LOGO_SRC;
  state.logoWidth = 260;
  state.logoMaxHeight = 112;
  state.logoAlign = 'center';
  syncControls();
  flushRender();
  setStatus('Default logo restored');
}

function renderItemsEditor() {
  const state = getState();
  if (!elements.itemsEditor) {
    return;
  }

  elements.itemsEditor.innerHTML = state.items.map((item, itemIndex) => `
    <div class="item-row" data-item-row="${itemIndex}">
      <div class="item-fields">
        <label class="wide"><span>Category</span><input type="text" value="${escapeHtml(item.category)}" data-item-field="category"></label>
        <label class="wide"><span>Title</span><input type="text" value="${escapeHtml(item.title)}" data-item-field="title"></label>
        <label class="wide"><span>Name</span><input type="text" value="${escapeHtml(item.name)}" data-item-field="name"></label>
        <label><span>Qty</span><input type="number" min="0" step="0.01" inputmode="decimal" value="${Number(item.quantity) || 0}" data-item-field="quantity"></label>
        <label><span>Unit</span><input type="text" value="${escapeHtml(item.unit)}" data-item-field="unit"></label>
        <label><span>Rate</span><input type="number" min="0" step="1" inputmode="decimal" value="${Number(item.unitPrice) || 0}" data-item-field="unitPrice"></label>
        <label><span>Discount</span><input type="number" min="0" step="1" inputmode="decimal" value="${Number(item.discount) || 0}" data-item-field="discount"></label>
        <output class="item-total" data-item-total>${formatMoney(getItemTotal(item), state.currency, state.locale)}</output>
        <label class="full"><span>Description</span><textarea rows="2" data-item-field="description">${escapeHtml(item.description)}</textarea></label>
        <label class="full"><span>Notes</span><textarea rows="2" data-item-field="notes">${escapeHtml(item.notes)}</textarea></label>
      </div>
      <button class="icon-button" type="button" aria-label="Remove item" data-action="remove-item">x</button>
    </div>
  `).join('');
}

function renderTeamEditor() {
  const state = getState();
  if (!elements.teamEditor) {
    return;
  }

  elements.teamEditor.innerHTML = renderTeamEditorHtml(state.team || []);
}

function renderSectionOrder() {
  if (!elements.sectionOrder) {
    return;
  }
  const state = getState();
  const order = state.sectionOrder || [];
  elements.sectionOrder.innerHTML = order.map((key) => `
    <button class="section-order-item" type="button" draggable="true" data-order-key="${escapeHtml(key)}">
      <span>${escapeHtml(sectionLabels[key] || key)}</span>
      <small>Drag to reorder</small>
    </button>
  `).join('');
}

function renderAnalytics() {
  if (!elements.analyticsDashboard) {
    return;
  }
  const state = getState();
  const totals = calculateTotals(state);
  const isQuotation = state.type === 'quotation';
  const quoteAccepted = /accepted|approved|converted/i.test(state.status || '');
  const isInquiry = state.type === 'inquiry';
  const activeTeam = (state.team || []).filter((member) => !/off|unavailable/i.test(member.status || '')).length;
  const outstanding = Math.max(0, totals.balance);
  const metrics = [
    ['Invoice Total', formatMoney(totals.total, state.currency, state.locale)],
    ['Outstanding', formatMoney(outstanding, state.currency, state.locale)],
    ['Quote Conversion', isQuotation ? (quoteAccepted ? '100%' : '0% pending') : 'N/A'],
    ['Inquiry Tracking', isInquiry ? state.status : `${cachedVersions.length} local versions`],
    ['Team Activity', `${activeTeam}/${(state.team || []).length} active`],
    ['Tax / VAT', `${Number(state.taxRate) || 0}% ${state.taxNumber ? 'registered' : 'not set'}`],
  ];
  elements.analyticsDashboard.innerHTML = metrics.map(([label, value]) => `
    <article class="analytics-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join('');
}

function syncEverything() {
  syncControls();
  renderItemsEditor();
  renderTeamEditor();
  renderSectionOrder();
  flushRender();
}

function populatePresetControls() {
  populateSelect(elements.brandTheme, brandThemes);
  populateSelect(elements.logoPreset, logoPresets);
  populateSelect(elements.fontPreset, fontPresets);
  populateSelect(elements.studioPreset, studioPresets);
}

function populateSelect(select, options) {
  if (!select) {
    return;
  }
  select.innerHTML = options.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.name)}</option>`).join('');
}

function syncControls() {
  const state = getState();

  elements.fieldControls.forEach((control) => {
    const fieldName = control.dataset.field;
    if (checkboxFields.has(fieldName)) {
      control.checked = Boolean(state[fieldName]);
      return;
    }
    control.value = state[fieldName] ?? '';
  });

  elements.businessControls.forEach((control) => {
    control.value = state.business[control.dataset.businessField] ?? '';
  });

  elements.labelControls.forEach((control) => {
    control.value = state.labels[control.dataset.labelField] ?? '';
  });

  elements.sectionControls.forEach((control) => {
    control.checked = Boolean(state.sections[control.dataset.sectionField]);
  });

  elements.layoutControls.forEach((control) => {
    const value = state.layout[control.dataset.layoutField];
    if (control.type === 'checkbox') {
      control.checked = Boolean(value);
    } else {
      control.value = value;
    }
  });

  elements.templateButtons.forEach((button) => {
    const isActive = button.dataset.template === state.type;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  syncTemplateVariantSelect(state);
  if (elements.brandTheme) {
    elements.brandTheme.value = state.brandThemeId || 'classic-gold';
  }
  if (elements.logoPreset) {
    elements.logoPreset.value = state.logoPresetId || 'primary-logo';
  }
  if (elements.fontPreset) {
    elements.fontPreset.value = state.fontPresetId || 'arial-system';
  }
  if (elements.studioPreset) {
    elements.studioPreset.value = state.studioPresetId || 'breezing-core';
  }

  applyLayout(state.layout);
  syncExportFileName();
}

function syncTemplateVariantSelect(state) {
  if (!elements.templateVariant) {
    return;
  }
  const variants = templateVariants[state.type] || templateVariants.invoice;
  elements.templateVariant.innerHTML = variants.map((variant) => `<option value="${escapeHtml(variant.id)}">${escapeHtml(variant.name)}</option>`).join('');
  elements.templateVariant.value = state.variantId || variants[0].id;
}

function renderAll() {
  renderFrameId = 0;
  const state = getState();
  renderPreview(state, elements.documentPreview);
  syncExportFileName();
  renderAnalytics();
}

function scheduleRender() {
  if (renderFrameId) {
    return;
  }
  renderFrameId = window.requestAnimationFrame(renderAll);
  scheduleAutosave('Auto-save');
}

function flushRender() {
  if (renderFrameId) {
    window.cancelAnimationFrame(renderFrameId);
    renderFrameId = 0;
  }
  renderAll();
  scheduleAutosave('Auto-save');
}

async function recoverDraft() {
  if (!isIndexedDbAvailable()) {
    setAutosaveStatus('Storage unavailable');
    return;
  }
  if (!appSettings.restoreDraftOnStartup) {
    setAutosaveStatus('Draft recovery paused');
    return;
  }
  try {
    const draft = await loadDraft();
    if (draft) {
      setState(draft);
      setStatus('Recovered autosaved draft');
      setAutosaveStatus('Draft recovered');
    } else {
      setAutosaveStatus('Offline ready');
    }
  } catch (error) {
    console.error(error);
    setAutosaveStatus('Recovery unavailable');
  }
}

function scheduleAutosave(reason = 'Auto-save') {
  if (!readyForAutosave || !isIndexedDbAvailable()) {
    return;
  }
  if (!appSettings.autosaveEnabled) {
    clearAutosaveTimer();
    setAutosaveStatus('Auto-save off');
    return;
  }

  const currentSignature = createAutosaveSignature();
  if (currentSignature === lastSavedSignature) {
    autosaveDirty = false;
    setAutosaveStatus(getAutosaveReadyMessage());
    return;
  }

  autosaveDirty = true;
  pendingAutosaveReason = reason;
  if (!autosaveTimeoutId) {
    autosaveTimeoutId = window.setTimeout(() => performAutosave(pendingAutosaveReason), getAutosaveIntervalMs(appSettings));
  }
  setAutosaveStatus(`Unsaved changes - auto-save in ${appSettings.autosaveIntervalMinutes} min`);
}

async function performAutosave(reason) {
  window.clearTimeout(autosaveTimeoutId);
  autosaveTimeoutId = 0;
  if (!readyForAutosave || !isIndexedDbAvailable() || !appSettings.autosaveEnabled) {
    return;
  }
  if (!autosaveDirty) {
    setAutosaveStatus(getAutosaveReadyMessage());
    return;
  }

  try {
    const validation = validateDocument(getState());
    if (!validation.valid) {
      setAutosaveStatus('Draft needs required fields');
      return;
    }
    const savedSignature = createAutosaveSignature();
    if (savedSignature === lastSavedSignature) {
      autosaveDirty = false;
      setAutosaveStatus(getAutosaveReadyMessage());
      return;
    }

    setAutosaveStatus('Auto-saving...');
    await saveDraft(getState());
    if (appSettings.saveRecoveryVersions) {
      await saveVersion(getState(), reason, { limit: appSettings.historyLimit });
      await refreshVersionList();
    }
    lastSavedSignature = savedSignature;
    autosaveDirty = createAutosaveSignature() !== lastSavedSignature;
    setAutosaveStatus(autosaveDirty ? `Saved locally - next auto-save in ${appSettings.autosaveIntervalMinutes} min` : 'Saved locally');
    if (autosaveDirty) {
      scheduleAutosave('Auto-save');
    }
  } catch (error) {
    console.error(error);
    setAutosaveStatus('Save failed');
  }
}

async function manualSaveVersion(reason = 'Manual version') {
  try {
    const savedSignature = createAutosaveSignature();
    await saveDraft(getState());
    await saveVersion(getState(), reason, { limit: appSettings.historyLimit });
    lastSavedSignature = savedSignature;
    autosaveDirty = false;
    clearAutosaveTimer();
    await refreshVersionList();
    setAutosaveStatus('Version saved');
    setStatus('Recoverable version saved');
  } catch (error) {
    console.error(error);
    setStatus('Version could not be saved');
  }
}

async function refreshVersionList() {
  if (!elements.versionList || !isIndexedDbAvailable()) {
    return;
  }
  cachedVersions = await listVersions();
  renderSettingsSummary();
  if (!cachedVersions.length) {
    elements.versionList.innerHTML = '<p class="empty-state">No previous versions yet.</p>';
    renderAnalytics();
    return;
  }
  elements.versionList.innerHTML = cachedVersions.slice(0, appSettings.historyLimit).map((version) => `
    <button class="version-item" type="button" data-version-id="${escapeHtml(version.id)}">
      <span>${escapeHtml([version.reason || 'Version', version.type || 'document'].join(' - '))}</span>
      <strong>${escapeHtml(version.title || 'Document')} ${escapeHtml(version.number || '')}</strong>
      <small>${escapeHtml(new Date(version.savedAt).toLocaleString())}</small>
    </button>
  `).join('');
  renderAnalytics();
}

async function restoreVersion(versionId) {
  const restoredState = await loadVersion(versionId);
  if (!restoredState) {
    setStatus('Version could not be restored');
    return;
  }
  pushUndoSnapshot();
  setState(restoredState);
  syncEverything();
  setStatus('Previous version restored');
}

async function restoreLatestDraft() {
  const draft = await loadDraft();
  if (!draft) {
    setStatus('No autosaved draft found');
    return;
  }
  pushUndoSnapshot();
  setState(draft);
  syncEverything();
  setStatus('Latest draft restored');
}

function setAutosaveStatus(message) {
  elements.autosaveStatusElements.forEach((element) => {
    element.textContent = message;
  });
}

function clearAutosaveTimer() {
  window.clearTimeout(autosaveTimeoutId);
  autosaveTimeoutId = 0;
}

function refreshAutosaveTimerForSettings() {
  renderSettingsSummary();
  if (!readyForAutosave) {
    return;
  }
  if (!appSettings.autosaveEnabled) {
    clearAutosaveTimer();
    setAutosaveStatus('Auto-save off');
    return;
  }
  if (autosaveDirty) {
    clearAutosaveTimer();
    scheduleAutosave(pendingAutosaveReason);
    return;
  }
  setAutosaveStatus(getAutosaveReadyMessage());
}

function getAutosaveReadyMessage() {
  return appSettings.autosaveEnabled ? `Auto-save ready (${appSettings.autosaveIntervalMinutes} min)` : 'Auto-save off';
}

function createAutosaveSignature() {
  return JSON.stringify(getState());
}

function pushUndoSnapshot() {
  if (historyLocked) {
    return;
  }
  undoStack.push(cloneData(getState()));
  if (undoStack.length > 40) {
    undoStack.shift();
  }
  redoStack = [];
}

function undoLastChange() {
  if (!undoStack.length) {
    setStatus('Nothing to undo');
    return;
  }
  historyLocked = true;
  redoStack.push(cloneData(getState()));
  setState(undoStack.pop());
  historyLocked = false;
  syncEverything();
  setStatus('Undo applied');
}

function redoLastChange() {
  if (!redoStack.length) {
    setStatus('Nothing to redo');
    return;
  }
  historyLocked = true;
  undoStack.push(cloneData(getState()));
  setState(redoStack.pop());
  historyLocked = false;
  syncEverything();
  setStatus('Redo applied');
}

async function generateDocumentNumber() {
  try {
    pushUndoSnapshot();
    const state = getState();
    state.number = await getNextDocumentNumber(state.type, state.numberPrefix || 'BP');
    syncControls();
    flushRender();
    setStatus('Document number generated');
  } catch (error) {
    console.error(error);
    setStatus('Document number could not be generated');
  }
}

function applyBrandTheme(themeId) {
  const theme = brandThemes.find((item) => item.id === themeId);
  if (!theme) {
    return;
  }
  pushUndoSnapshot();
  Object.assign(getState(), theme.values, { brandThemeId: theme.id });
  syncControls();
  flushRender();
  setStatus(`${theme.name} theme applied`);
}

function applyLogoPreset(presetId) {
  const preset = logoPresets.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  const state = getState();
  pushUndoSnapshot();
  state.logoPresetId = preset.id;
  state.logoSrc = preset.src;
  state.logoWidth = preset.width;
  state.logoMaxHeight = preset.maxHeight;
  state.logoAlign = preset.align;
  syncControls();
  flushRender();
  setStatus(`${preset.name} logo preset applied`);
}

function applyFontPreset(presetId) {
  const preset = fontPresets.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  pushUndoSnapshot();
  getState().fontPresetId = preset.id;
  getState().fontFamily = preset.fontFamily;
  syncControls();
  flushRender();
  setStatus(`${preset.name} typography applied`);
}

function applyStudioPreset(presetId) {
  const preset = studioPresets.find((item) => item.id === presetId);
  if (!preset) {
    return;
  }
  const state = getState();
  pushUndoSnapshot();
  state.studioPresetId = preset.id;
  state.business.tagline = preset.values.tagline;
  state.paymentMethod = preset.values.paymentMethod;
  syncControls();
  flushRender();
  setStatus(`${preset.name} studio preset applied`);
}

function reorderSection(sourceKey, targetKey) {
  if (sourceKey === targetKey) {
    return;
  }
  const state = getState();
  const order = [...(state.sectionOrder || [])];
  const sourceIndex = order.indexOf(sourceKey);
  const targetIndex = order.indexOf(targetKey);
  if (sourceIndex === -1 || targetIndex === -1) {
    return;
  }
  pushUndoSnapshot();
  order.splice(sourceIndex, 1);
  order.splice(targetIndex, 0, sourceKey);
  state.sectionOrder = order;
  renderSectionOrder();
  flushRender();
  setStatus('Document sections reordered');
}

async function openAutosaveModal() {
  if (!elements.autosaveModal) {
    return;
  }
  await refreshVersionList();
  lastFocusedElement = document.activeElement;
  elements.autosaveModal.hidden = false;
  document.body.classList.add('is-modal-open');
  elements.autosaveModal.querySelector('[data-action="restore-latest-draft"]')?.focus();
}

function closeAutosaveModal() {
  if (!elements.autosaveModal || elements.autosaveModal.hidden) {
    return;
  }
  elements.autosaveModal.hidden = true;
  document.body.classList.remove('is-modal-open');
  restoreLastFocus();
}

function openSettingsModal() {
  if (!elements.settingsModal) {
    return;
  }
  syncSettingsControls();
  lastFocusedElement = document.activeElement;
  elements.settingsModal.hidden = false;
  document.body.classList.add('is-modal-open');
  elements.settingsControls[0]?.focus();
}

function closeSettingsModal() {
  if (!elements.settingsModal || elements.settingsModal.hidden) {
    return;
  }
  elements.settingsModal.hidden = true;
  document.body.classList.remove('is-modal-open');
  restoreLastFocus();
}

function openCommandPalette() {
  if (!elements.commandPalette) {
    return;
  }
  lastFocusedElement = document.activeElement;
  elements.commandPalette.hidden = false;
  document.body.classList.add('is-modal-open');
  renderCommandList('');
  elements.commandSearch?.focus();
}

function closeCommandPalette() {
  if (!elements.commandPalette || elements.commandPalette.hidden) {
    return;
  }
  elements.commandPalette.hidden = true;
  document.body.classList.remove('is-modal-open');
  restoreLastFocus();
}

function renderCommandList(query = '') {
  if (!elements.commandList) {
    return;
  }
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCommands = commandItems.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(normalizedQuery));
  elements.commandList.innerHTML = filteredCommands.map((command) => `
    <button class="command-item" type="button" data-command-action="${escapeHtml(command.action)}">
      <strong>${escapeHtml(command.label)}</strong>
      <span>${escapeHtml(command.hint)}</span>
    </button>
  `).join('') || '<p class="empty-state">No matching command.</p>';
}

function setStatus(message) {
  if (!elements.statusMessage) {
    return;
  }

  elements.statusMessage.textContent = message;
  window.clearTimeout(statusTimeoutId);
  statusTimeoutId = window.setTimeout(() => {
    elements.statusMessage.textContent = '';
  }, 3200);
}

function applyLayout(layout) {
  const dock = layout.dock || 'left';
  document.body.dataset.panelDock = dock;
  document.body.dataset.previewZoom = layout.zoom || 'fit';
  document.body.classList.toggle('compact-editor', Boolean(layout.compact));
  document.body.classList.toggle('dark-mode', Boolean(layout.darkMode));

  const isHidden = dock === 'hidden' || document.body.classList.contains('panel-collapsed');
  document.querySelectorAll('[data-action="toggle-panel"]').forEach((button) => {
    button.setAttribute('aria-expanded', String(!isHidden));
  });
}

function togglePanel() {
  const state = getState();
  if (state.layout.dock === 'hidden') {
    state.layout.dock = localStorage.getItem(`${STORAGE_KEY}-last-dock`) || 'left';
    document.body.classList.remove('panel-collapsed');
  } else {
    document.body.classList.toggle('panel-collapsed');
  }
  syncControls();
  saveLayout(state.layout);
}

function saveLayout(layout) {
  if (layout.dock && layout.dock !== 'hidden') {
    localStorage.setItem(`${STORAGE_KEY}-last-dock`, layout.dock);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

function loadSavedLayout() {
  try {
    const savedLayout = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (savedLayout) {
      getState().layout = { ...getState().layout, ...savedLayout };
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function openExportModal() {
  if (!elements.exportModal) {
    return;
  }
  flushRender();
  lastFocusedElement = document.activeElement;
  syncExportFileName();
  elements.exportModal.hidden = false;
  document.body.classList.add('is-modal-open');
  const checkedFormat = elements.exportModal.querySelector('input[name="exportFormat"]:checked');
  checkedFormat?.focus();
}

function closeExportModal() {
  if (!elements.exportModal || elements.exportModal.hidden) {
    return;
  }
  elements.exportModal.hidden = true;
  document.body.classList.remove('is-modal-open');
  restoreLastFocus();
}

function trapActiveModalFocus(event) {
  const activeModal = [elements.exportModal, elements.autosaveModal, elements.settingsModal, elements.commandPalette]
    .find((modal) => modal && !modal.hidden);
  if (!activeModal) {
    return;
  }

  const focusableElements = Array.from(activeModal.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'))
    .filter((element) => !element.disabled && element.offsetParent !== null);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  if (!firstElement || !lastElement) {
    return;
  }

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function restoreLastFocus() {
  if (lastFocusedElement instanceof HTMLElement) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

function collectExportOptions() {
  const modal = elements.exportModal;
  return {
    format: modal.querySelector('input[name="exportFormat"]:checked')?.value || 'pdf',
    fileName: modal.querySelector('[data-export-option="fileName"]')?.value || '',
    scale: Number(modal.querySelector('[data-export-option="scale"]')?.value || 2),
    quality: Number(modal.querySelector('[data-export-option="quality"]')?.value || 0.92),
    includeBackground: Boolean(modal.querySelector('[data-export-option="includeBackground"]')?.checked),
    openAfter: Boolean(modal.querySelector('[data-export-option="openAfter"]')?.checked),
    includeBackup: Boolean(modal.querySelector('[data-export-option="includeBackup"]')?.checked),
    hideControls: Boolean(modal.querySelector('[data-export-option="hideControls"]')?.checked),
  };
}

function syncExportFileName() {
  if (elements.exportFileName) {
    elements.exportFileName.value = getFileBaseName(getState());
  }
}

async function runExport(options) {
  try {
    flushRender();
    await handleExport(getState(), options, setStatus);
    if (options.format && options.format !== 'json') {
      closeExportModal();
    }
  } catch (error) {
    console.error(error);
    setStatus('Export failed. Check the browser console.');
  }
}

async function importJson(file) {
  try {
    const text = await file.text();
    const importedDocument = unwrapExportPayload(JSON.parse(text));
    const validation = validateDocument(importedDocument);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }
    pushUndoSnapshot();
    setState(importedDocument);
    syncEverything();
    setStatus('Backup loaded');
  } catch (error) {
    console.error(error);
    setStatus('Backup could not be loaded');
  }
}

function exposeTestingApi() {
  window.StudioManager = {
    getState,
    getSettings: () => ({ ...appSettings }),
    updateSettings: (settings) => {
      appSettings = saveSettings(normalizeSettings({ ...appSettings, ...settings }));
      syncSettingsControls();
      refreshAutosaveTimerForSettings();
      return { ...appSettings };
    },
    getAutosaveDebug: () => ({
      dirty: autosaveDirty,
      timerActive: Boolean(autosaveTimeoutId),
      intervalMs: getAutosaveIntervalMs(appSettings),
      status: elements.autosaveStatusElements[0]?.textContent || '',
      cachedVersions: cachedVersions.length,
      settings: { ...appSettings },
    }),
    forceAutosave: (reason = 'Test auto-save') => performAutosave(reason),
    createExportEnvelope: () => createExportEnvelope(getState()),
    renderDocumentCanvas: (options) => renderDocumentCanvas(getState(), options),
    handleExport: (options) => handleExport(getState(), options, setStatus),
    renderItemsEditor,
    renderTeamEditor,
    renderAll,
  };
}
