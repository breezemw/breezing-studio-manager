import { BASE_DOCUMENT_HEIGHT, BASE_DOCUMENT_WIDTH } from './config.js';
import { renderDocumentCanvas } from './canvas-renderer.js';
import { canvasToBlob, collectCssText, dataUrlToBytes, downloadBlob, escapeHtml, getFileBaseName, imageToDataUrl } from './utils.js';

export async function handleExport(state, exportOptions = {}, setStatus = () => {}) {
  const format = exportOptions.format || 'pdf';
  const fileBaseName = getFileBaseName(state, exportOptions.fileName || '');
  const scale = Number(exportOptions.scale) || 2;
  const quality = Number(exportOptions.quality) || 0.92;
  const openAfter = Boolean(exportOptions.openAfter);

  setStatus(`Preparing ${format.toUpperCase()} export`);

  if (format === 'print') {
    window.print();
    setStatus('Print dialog opened');
    return;
  }

  if (format === 'json') {
    exportJson(state, fileBaseName, openAfter);
    setStatus('Backup exported');
    return;
  }

  if (format === 'html') {
    await exportHtmlDocument(state, fileBaseName, openAfter);
    setStatus('HTML exported');
    await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
    return;
  }

  if (format === 'word') {
    await exportWordDocument(state, fileBaseName, scale, quality, openAfter, exportOptions);
    setStatus('Word document exported');
    await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
    return;
  }

  const canvas = await renderDocumentCanvas(state, {
    scale,
    includeBackground: exportOptions.includeBackground,
  });

  if (format === 'png') {
    const pngBlob = await canvasToBlob(canvas, 'image/png');
    downloadBlob(pngBlob, `${fileBaseName}.png`, openAfter);
    setStatus('PNG exported');
    await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
    return;
  }

  if (format === 'jpeg') {
    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
    downloadBlob(jpegBlob, `${fileBaseName}.jpg`, openAfter);
    setStatus('JPEG exported');
    await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
    return;
  }

  if (format === 'webp') {
    const webpBlob = await canvasToBlob(canvas, 'image/webp', quality);
    downloadBlob(webpBlob, `${fileBaseName}.webp`, openAfter);
    setStatus('WebP exported');
    await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
    return;
  }

  const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
  const jpegBytes = dataUrlToBytes(jpegDataUrl);
  const pdfBytes = createPdfFromJpeg(jpegBytes, canvas.width, canvas.height);
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${fileBaseName}.pdf`, openAfter);
  setStatus('PDF exported');
  await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
}

export function exportJson(state, fileBaseName, openAfter = false) {
  downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), `${fileBaseName}.json`, openAfter);
}

async function maybeExportBackup(state, fileBaseName, includeBackup) {
  if (includeBackup) {
    exportJson(state, `${fileBaseName}-backup`, false);
  }
}

async function exportHtmlDocument(state, fileBaseName, openAfter) {
  const previewHtml = await getExportPreviewHtml(state);
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(state.title)} ${escapeHtml(state.number)}</title>
<style>
${collectCssText()}
body { background: #ffffff; padding: 24px; }
.app-header, .control-panel, .preview-toolbar, .utility-row, .floating-controls, .modal-backdrop { display: none !important; }
.document-stage { border: 0; background: #ffffff; }
.document-page { margin: 0 auto; box-shadow: none; }
</style>
</head>
<body>
<div class="document-stage">${previewHtml}</div>
</body>
</html>`;
  downloadBlob(new Blob(['\ufeff', html], { type: 'text/html' }), `${fileBaseName}.html`, openAfter);
}

async function exportWordDocument(state, fileBaseName, scale, quality, openAfter, exportOptions) {
  const canvas = await renderDocumentCanvas(state, {
    scale,
    includeBackground: exportOptions.includeBackground,
  });
  const imageDataUrl = canvas.toDataURL('image/jpeg', quality);
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(state.title)} ${escapeHtml(state.number)}</title>
<style>
@page { size: A4; margin: 0; }
body { margin: 0; background: #ffffff; }
.page { width: 210mm; min-height: 297mm; margin: 0 auto; }
img { display: block; width: 210mm; height: 297mm; object-fit: contain; }
</style>
</head>
<body>
<div class="page"><img src="${imageDataUrl}" alt="${escapeHtml(state.title)} ${escapeHtml(state.number)}"></div>
</body>
</html>`;
  downloadBlob(new Blob(['\ufeff', html], { type: 'application/msword' }), `${fileBaseName}.doc`, openAfter);
}

async function getExportPreviewHtml(state) {
  const preview = document.querySelector('[data-document-preview]');
  if (!preview) {
    return '';
  }

  const previewClone = preview.cloneNode(true);
  const logoImage = previewClone.querySelector('.doc-logo');
  const signatureImage = previewClone.querySelector('.signature-box img');
  const watermarkImage = previewClone.querySelector('.doc-watermark img');

  if (logoImage) {
    logoImage.src = await imageToDataUrl(state.logoSrc);
  }
  if (signatureImage && state.signatureSrc) {
    signatureImage.src = await imageToDataUrl(state.signatureSrc);
  }
  if (watermarkImage && state.watermarkSrc) {
    watermarkImage.src = await imageToDataUrl(state.watermarkSrc);
  }

  return previewClone.outerHTML;
}

function createPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let totalLength = 0;

  function appendString(value) {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    totalLength += bytes.length;
  }

  function appendBytes(bytes) {
    chunks.push(bytes);
    totalLength += bytes.length;
  }

  function startObject(objectNumber) {
    offsets[objectNumber] = totalLength;
    appendString(`${objectNumber} 0 obj\n`);
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ`;

  appendString('%PDF-1.3\n');
  startObject(1);
  appendString('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject(2);
  appendString('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject(3);
  appendString(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`);
  startObject(4);
  appendString(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);
  startObject(5);
  appendString(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  appendBytes(jpegBytes);
  appendString('\nendstream\nendobj\n');

  const xrefOffset = totalLength;
  appendString('xref\n0 6\n0000000000 65535 f \n');
  for (let objectNumber = 1; objectNumber <= 5; objectNumber += 1) {
    appendString(`${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`);
  }
  appendString(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfBytes = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    pdfBytes.set(chunk, offset);
    offset += chunk.length;
  });
  return pdfBytes;
}

export const __testing = { createPdfFromJpeg };
