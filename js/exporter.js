import { renderDocumentCanvas } from './canvas-renderer.js?v=20260522-autosave-settings';
import { DEFAULT_PAPER_SIZE, getPaperSize } from './config.js?v=20260522-autosave-settings';
import { createExportEnvelope } from './schema.js?v=20260522-autosave-settings';
import { canvasToBlob, collectCssText, dataUrlToBytes, downloadBlob, escapeHtml, getFileBaseName, imageToDataUrl } from './utils.js?v=20260522-autosave-settings';

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
  const pdfBytes = createPdfFromJpeg(jpegBytes, canvas.width, canvas.height, {
    title: `${state.title || 'Document'} ${state.number || ''}`.trim(),
    author: state.business?.name || 'Breezing Pictures',
    subject: `${state.type || 'studio'} export`,
    keywords: 'invoice, quotation, inquiry, receipt, correction, Breezing Pictures',
  });
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), `${fileBaseName}.pdf`, openAfter);
  setStatus('PDF exported');
  await maybeExportBackup(state, fileBaseName, exportOptions.includeBackup);
}

export function exportJson(state, fileBaseName, openAfter = false) {
  downloadBlob(new Blob([JSON.stringify(createExportEnvelope(state), null, 2)], { type: 'application/json' }), `${fileBaseName}.json`, openAfter);
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
.app-header, .control-panel, .utility-row, .floating-controls, .modal-backdrop { display: none !important; }
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
  const paper = getPaperSize(state.paperSize || DEFAULT_PAPER_SIZE);
  const pageWidth = paper.printWidth || '210mm';
  const pageHeight = paper.printHeight || '297mm';
  const imageDataUrl = canvas.toDataURL('image/jpeg', quality);
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(state.title)} ${escapeHtml(state.number)}</title>
<style>
@page { size: ${paper.printSize}; margin: 0; }
body { margin: 0; background: #ffffff; }
.page { width: ${pageWidth}; min-height: ${pageHeight}; margin: 0 auto; }
img { display: block; width: ${pageWidth}; height: auto; }
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

function createPdfFromJpeg(jpegBytes, imageWidth, imageHeight, metadata = {}) {
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let totalLength = 0;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const renderedHeight = pageWidth * (imageHeight / imageWidth);
  const pageCount = Math.max(1, Math.ceil(renderedHeight / pageHeight));
  const imageObjectNumber = 2 * pageCount + 3;
  const infoObjectNumber = imageObjectNumber + 1;

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

  appendString('%PDF-1.3\n');
  startObject(1);
  appendString(`<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  startObject(2);
  appendString(`<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${index + 3} 0 R`).join(' ')}] /Count ${pageCount} >>\nendobj\n`);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageObjectNumber = pageIndex + 3;
    const contentObjectNumber = pageCount + 3 + pageIndex;
    startObject(pageObjectNumber);
    appendString(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 ${imageObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>\nendobj\n`);
  }

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const contentObjectNumber = pageCount + 3 + pageIndex;
    const yOffset = -(pageIndex * pageHeight);
    const content = `q\n${pageWidth} 0 0 ${renderedHeight} 0 ${yOffset} cm\n/Im1 Do\nQ`;
    startObject(contentObjectNumber);
    appendString(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream\nendobj\n`);
  }

  startObject(imageObjectNumber);
  appendString(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  appendBytes(jpegBytes);
  appendString('\nendstream\nendobj\n');

  startObject(infoObjectNumber);
  appendString(`<< /Title (${pdfText(metadata.title || 'Studio document')}) /Author (${pdfText(metadata.author || 'Breezing Pictures')}) /Subject (${pdfText(metadata.subject || 'Studio document export')}) /Keywords (${pdfText(metadata.keywords || 'Breezing Pictures')}) /Producer (Breezing Pictures Studio Manager) /CreationDate (${pdfDate(new Date())}) >>\nendobj\n`);

  const xrefOffset = totalLength;
  const objectCount = infoObjectNumber;
  appendString(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let objectNumber = 1; objectNumber <= objectCount; objectNumber += 1) {
    appendString(`${String(offsets[objectNumber]).padStart(10, '0')} 00000 n \n`);
  }
  appendString(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info ${infoObjectNumber} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const pdfBytes = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    pdfBytes.set(chunk, offset);
    offset += chunk.length;
  });
  return pdfBytes;
}

function pdfText(value) {
  return String(value || '').replace(/[\\()]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

function pdfDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export const __testing = { createPdfFromJpeg };
