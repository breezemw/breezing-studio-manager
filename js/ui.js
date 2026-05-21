import { DEFAULT_LOGO_SRC, STORAGE_KEY } from './config.js';
import { applyTemplate, createBlankItem, getState, resetCurrentTemplate, setState } from './state.js';
import { handleExport } from './exporter.js';
import { renderDocumentCanvas } from './canvas-renderer.js';
import { renderPreview } from './preview.js';
import { escapeHtml, fileToDataUrl, formatMoney, getFileBaseName, getItemTotal } from './utils.js';

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

let elements = {};
let statusTimeoutId = 0;

export function initUi() {
  elements = collectElements();
  loadSavedLayout();
  syncControls();
  renderItemsEditor();
  renderAll();
  bindEvents();
  exposeTestingApi();
}

function collectElements() {
  return {
    documentPreview: document.querySelector('[data-document-preview]'),
    previewName: document.querySelector('[data-preview-name]'),
    itemsEditor: document.querySelector('[data-items-editor]'),
    statusMessage: document.querySelector('[data-status-message]'),
    importJsonInput: document.querySelector('[data-import-json]'),
    exportModal: document.querySelector('[data-export-modal]'),
    exportFileName: document.querySelector('[data-export-option="fileName"]'),
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

  elements.templateButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyTemplate(button.dataset.template);
      syncControls();
      renderItemsEditor();
      renderAll();
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

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-action]');
    const exportButton = event.target.closest('[data-export]');

    if (actionButton) {
      handleAction(actionButton.dataset.action);
    }

    if (exportButton) {
      runExport({ format: exportButton.dataset.export });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeExportModal();
    }
  });

  if (elements.exportModal) {
    elements.exportModal.addEventListener('click', (event) => {
      if (event.target === elements.exportModal) {
        closeExportModal();
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
  if (action === 'reset-logo') {
    resetLogo();
  }
  if (action === 'reset-template') {
    resetCurrentTemplate();
    syncControls();
    renderItemsEditor();
    renderAll();
    setStatus('New document created');
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

  if (checkboxFields.has(fieldName)) {
    state[fieldName] = control.checked;
  } else if (numericFields.has(fieldName)) {
    state[fieldName] = Number(control.value) || 0;
  } else {
    state[fieldName] = control.value;
  }

  renderAll();
}

function updateNestedField(groupName, fieldName, value) {
  const state = getState();
  if (!state[groupName] || !fieldName) {
    return;
  }
  state[groupName][fieldName] = value;
  renderAll();
}

function updateSectionField(fieldName, checked) {
  const state = getState();
  state.sections[fieldName] = checked;
  renderAll();
}

function updateLayoutField(control) {
  const state = getState();
  const fieldName = control.dataset.layoutField;
  if (!fieldName) {
    return;
  }

  state.layout[fieldName] = control.type === 'checkbox' ? control.checked : control.value;
  applyLayout(state.layout);
  saveLayout(state.layout);
}

function addItem() {
  const state = getState();
  state.items.push(createBlankItem());
  renderItemsEditor();
  renderAll();
  setStatus('Item added');
}

function removeItem(itemIndex) {
  const state = getState();
  if (state.items.length === 1) {
    state.items[0] = createBlankItem();
  } else {
    state.items.splice(itemIndex, 1);
  }
  renderItemsEditor();
  renderAll();
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

  item[fieldName] = itemNumberFields.has(fieldName) ? Number(target.value) || 0 : target.value;
  const totalOutput = itemRow.querySelector('[data-item-total]');
  if (totalOutput) {
    totalOutput.textContent = formatMoney(getItemTotal(item), state.currency);
  }
  renderAll();
}

async function handleImageInput(input) {
  const state = getState();
  const imageType = input.dataset.imageInput;
  const file = input.files && input.files[0];
  if (!file || !imageType) {
    return;
  }

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
  renderAll();
  setStatus(`${imageType} updated`);
}

function resetLogo() {
  const state = getState();
  state.logoSrc = DEFAULT_LOGO_SRC;
  state.logoWidth = 260;
  state.logoMaxHeight = 112;
  state.logoAlign = 'center';
  syncControls();
  renderAll();
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
        <label><span>Qty</span><input type="number" min="0" step="0.01" value="${Number(item.quantity) || 0}" data-item-field="quantity"></label>
        <label><span>Unit</span><input type="text" value="${escapeHtml(item.unit)}" data-item-field="unit"></label>
        <label><span>Rate</span><input type="number" min="0" step="1" value="${Number(item.unitPrice) || 0}" data-item-field="unitPrice"></label>
        <label><span>Discount</span><input type="number" min="0" step="1" value="${Number(item.discount) || 0}" data-item-field="discount"></label>
        <output class="item-total" data-item-total>${formatMoney(getItemTotal(item), state.currency)}</output>
        <label class="full"><span>Description</span><textarea rows="2" data-item-field="description">${escapeHtml(item.description)}</textarea></label>
        <label class="full"><span>Notes</span><textarea rows="2" data-item-field="notes">${escapeHtml(item.notes)}</textarea></label>
      </div>
      <button class="icon-button" type="button" aria-label="Remove item" data-action="remove-item">x</button>
    </div>
  `).join('');
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
    button.classList.toggle('is-active', button.dataset.template === state.type);
  });

  applyLayout(state.layout);
  syncExportFileName();
}

function renderAll() {
  const state = getState();
  renderPreview(state, elements.documentPreview, elements.previewName);
  syncExportFileName();
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
    setState(JSON.parse(text));
    syncControls();
    renderItemsEditor();
    renderAll();
    setStatus('Backup loaded');
  } catch (error) {
    console.error(error);
    setStatus('Backup could not be loaded');
  }
}

function exposeTestingApi() {
  window.StudioManager = {
    getState,
    renderDocumentCanvas: (options) => renderDocumentCanvas(getState(), options),
    handleExport: (options) => handleExport(getState(), options, setStatus),
    renderItemsEditor,
    renderAll,
  };
}
