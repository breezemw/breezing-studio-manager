export function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function multilineHtml(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

export function formatDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  const parsedDate = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue;
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMoney(amount, currency = 'MWK', locale = 'en-MW') {
  const numericAmount = Number(amount) || 0;
  const formattedAmount = numericAmount.toLocaleString(locale || 'en-MW', {
    minimumFractionDigits: Number.isInteger(numericAmount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency || 'MWK'} ${formattedAmount}`;
}

export function getItemSubtotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

export function getItemTotal(item) {
  return Math.max(0, getItemSubtotal(item) - (Number(item.discount) || 0));
}

export function calculateTotals(state) {
  const itemSubtotal = state.items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const itemDiscounts = state.items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
  const documentDiscount = Math.max(0, Number(state.discount) || 0);
  const extraCharge = Math.max(0, Number(state.extraCharge) || 0);
  const subtotalAfterItemDiscount = Math.max(0, itemSubtotal - itemDiscounts);
  const taxableAmount = Math.max(0, subtotalAfterItemDiscount - documentDiscount + extraCharge);
  const tax = taxableAmount * ((Number(state.taxRate) || 0) / 100);
  const total = taxableAmount + tax;
  const paid = Math.max(0, Number(state.amountPaid) || 0);
  const balance = total - paid;
  return { itemSubtotal, itemDiscounts, documentDiscount, extraCharge, tax, total, paid, balance };
}

export function isPaidStatus(state) {
  const normalizedStatus = String(state.status || '').toUpperCase();
  return normalizedStatus.includes('PAID') || normalizedStatus.includes('RECEIVED');
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

const imageCache = new Map();

export function loadImage(src) {
  if (!src) {
    return Promise.resolve(null);
  }

  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

export async function imageToDataUrl(src) {
  if (!src || src.startsWith('data:')) {
    return src || '';
  }

  const image = await loadImage(src);
  if (!image) {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}

export function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) {
    bytes[byteIndex] = binary.charCodeAt(byteIndex);
  }
  return bytes;
}

export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export function downloadBlob(blob, fileName, openAfter = false) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  if (openAfter) {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    return;
  }

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function getFileBaseName(state, overrideName = '') {
  const rawName = overrideName || `${state.title || 'document'}-${state.number || 'draft'}`;
  return rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'breezing-document';
}

export function collectCssText() {
  return Array.from(document.styleSheets).map((styleSheet) => {
    try {
      return Array.from(styleSheet.cssRules).map((rule) => rule.cssText).join('\n');
    } catch {
      return '';
    }
  }).join('\n');
}
