import { BASE_DOCUMENT_HEIGHT, BASE_DOCUMENT_WIDTH, PREVIEW_DOCUMENT_WIDTH } from './config.js?v=20260522-toolbar';
import { calculateTotals, formatDate, formatMoney, getItemTotal, isPaidStatus, loadImage } from './utils.js?v=20260522-toolbar';

let activeCanvasFontFamily = 'Arial, Helvetica, sans-serif';

export async function renderDocumentCanvas(state, options = {}) {
  const exportScale = Number(options.scale) || 2;
  const documentHeight = estimateCanvasHeight(state);
  const canvas = document.createElement('canvas');
  canvas.width = BASE_DOCUMENT_WIDTH * exportScale;
  canvas.height = documentHeight * exportScale;
  const context = canvas.getContext('2d');
  context.scale(exportScale, exportScale);

  const margin = 90;
  const contentWidth = BASE_DOCUMENT_WIDTH - margin * 2;
  const totals = calculateTotals(state);
  const accentColor = state.accentColor || '#c9961a';
  const darkColor = state.darkColor || '#111111';
  const paperColor = options.includeBackground === false ? 'rgba(255,255,255,0)' : (state.paperColor || '#ffffff');
  const lineColor = state.lineColor || '#d9d5c8';
  const currency = state.currency || 'MWK';
  const fontScale = Number(state.fontScale) || 1;
  const locale = state.locale || 'en-MW';
  activeCanvasFontFamily = state.fontFamily || 'Arial, Helvetica, sans-serif';

  context.fillStyle = paperColor;
  context.fillRect(0, 0, BASE_DOCUMENT_WIDTH, documentHeight);

  if (state.showWatermark && state.watermarkSrc) {
    await drawWatermark(context, state, documentHeight);
  }

  context.fillStyle = darkColor;
  context.fillRect(0, 0, BASE_DOCUMENT_WIDTH, 17);
  context.fillStyle = accentColor;
  context.fillRect(0, 17, BASE_DOCUMENT_WIDTH, 5);

  let currentY = 70;
  currentY = await drawLogo(context, state, margin, currentY);
  drawText(context, state.business.name, BASE_DOCUMENT_WIDTH / 2, currentY, { align: 'center', size: 40 * fontScale, weight: '700', color: darkColor });
  currentY += 45;
  drawText(context, state.business.tagline, BASE_DOCUMENT_WIDTH / 2, currentY, { align: 'center', size: 20 * fontScale, weight: '700', color: accentColor });
  if (state.subtitle) {
    currentY += 28;
    drawText(context, state.subtitle, BASE_DOCUMENT_WIDTH / 2, currentY, { align: 'center', size: 18 * fontScale, weight: '700', color: state.textColor || '#111111' });
  }

  currentY += 55;
  context.fillStyle = lineColor;
  context.fillRect(margin, currentY, contentWidth, 3);
  context.fillStyle = accentColor;
  context.fillRect(margin, currentY, 260, 7);

  currentY += 48;
  drawText(context, state.title, margin, currentY, { size: 66 * fontScale, weight: '700', color: darkColor });
  drawText(context, `No. ${state.number}`, BASE_DOCUMENT_WIDTH - margin, currentY + 4, { align: 'right', size: 26 * fontScale, weight: '700', color: darkColor });
  drawText(context, `Date: ${formatDate(state.date)}`, BASE_DOCUMENT_WIDTH - margin, currentY + 42, { align: 'right', size: 22 * fontScale, weight: '700', color: '#666666' });
  if (state.dueDate) {
    drawText(context, `Due/Event: ${formatDate(state.dueDate)}`, BASE_DOCUMENT_WIDTH - margin, currentY + 76, { align: 'right', size: 20 * fontScale, weight: '700', color: '#666666' });
  }

  const statusWidth = Math.min(430, Math.max(170, measure(context, state.status, 18 * fontScale, '700') + 60));
  const statusX = BASE_DOCUMENT_WIDTH - margin - statusWidth;
  const statusY = currentY + 110;
  drawRoundRect(context, statusX, statusY, statusWidth, 44, 12, isPaidStatus(state) ? '#f2faf2' : '#fff7e4', isPaidStatus(state) ? '#6fa36f' : accentColor, 2);
  drawText(context, state.status, statusX + statusWidth / 2, statusY + 13, { align: 'center', size: 18 * fontScale, weight: '700', color: isPaidStatus(state) ? '#2e6b35' : '#8c641f' });

  currentY += 182;
  const orderedSections = state.sectionOrder || ['intro', 'cards', 'team', 'items', 'notes', 'signature'];
  for (const sectionKey of orderedSections) {
    if (sectionKey === 'cards') {
      currentY = drawInfoCards(context, state, margin, currentY, contentWidth, accentColor, darkColor, lineColor, fontScale);
    }
    if (sectionKey === 'team' && state.sections.team) {
      currentY = drawTeamSection(context, state, margin, currentY, contentWidth, accentColor, darkColor, lineColor, fontScale);
    }
    if (sectionKey === 'intro' && state.sections.intro && state.intro) {
      drawRoundRect(context, margin, currentY, contentWidth, 90, 12, '#eef3f8', '#cfd9e5', 2);
      context.fillStyle = accentColor;
      context.fillRect(margin, currentY, 8, 90);
      drawWrappedText(context, state.intro, margin + 28, currentY + 22, contentWidth - 56, 25 * fontScale, { size: 20 * fontScale, color: '#343434' });
      currentY += 118;
    }
    if (sectionKey === 'items' && state.sections.items) {
      currentY = drawCanvasTable(context, state, margin, currentY, contentWidth, totals, accentColor, darkColor, lineColor, currency, locale, fontScale);
      currentY += 28;
    }
    if (sectionKey === 'notes') {
      currentY = drawNotePayment(context, state, margin, currentY, contentWidth, accentColor, darkColor, lineColor, fontScale);
      currentY += 36;
    }
    if (sectionKey === 'signature' && state.sections.signature) {
      await drawSignature(context, state, margin, currentY, contentWidth, darkColor, fontScale);
      currentY += 170;
    }
  }

  if (state.sections.footerBar) {
    context.fillStyle = accentColor;
    context.fillRect(0, documentHeight - 22, BASE_DOCUMENT_WIDTH, 6);
    context.fillStyle = darkColor;
    context.fillRect(0, documentHeight - 16, BASE_DOCUMENT_WIDTH, 16);
  }

  return canvas;
}

function estimateCanvasHeight(state) {
  const fontScale = Number(state.fontScale) || 1;
  const itemRowsHeight = state.sections.items
    ? state.items.reduce((sum, item) => {
      const textLength = [item.title, item.category, item.name, item.description, item.notes].filter(Boolean).join(' ').length;
      return sum + Math.max(66, Math.ceil(textLength / 68) * 23 * fontScale + 42);
    }, 0)
    : 0;
  const footerRows = 1
    + (state.discount ? 1 : 0)
    + (state.extraCharge ? 1 : 0)
    + (state.taxRate ? 1 : 0)
    + ((state.type === 'receipt' || state.amountPaid) ? 2 : 0);
  const tableHeight = state.sections.items ? 28 + 52 + itemRowsHeight + footerRows * 48 + 90 : 0;
  const teamCount = state.sections.team && Array.isArray(state.team) ? state.team.filter((member) => member.name || member.role || member.assignment).length : 0;
  const teamHeight = teamCount ? 38 + Math.ceil(teamCount / 2) * 152 + 20 : 0;
  const infoHeight = state.sections.client || state.sections.business ? 284 : 0;
  const introHeight = state.sections.intro && state.intro ? 118 : 0;
  const noteHeight = state.sections.notes || state.sections.payment ? 226 : 0;
  const signatureHeight = state.sections.signature ? 180 : 0;
  const fixedChromeHeight = 438;
  const estimatedHeight = fixedChromeHeight + infoHeight + teamHeight + introHeight + tableHeight + noteHeight + signatureHeight;
  return Math.max(BASE_DOCUMENT_HEIGHT, Math.ceil(estimatedHeight + 90));
}

function drawTeamSection(context, state, margin, currentY, contentWidth, accentColor, darkColor, lineColor, fontScale) {
  const team = Array.isArray(state.team) ? state.team.filter((member) => member.name || member.role || member.assignment) : [];
  if (!team.length) {
    return currentY;
  }

  drawText(context, 'PRODUCTION TEAM', margin, currentY, { size: 17 * fontScale, weight: '700', color: accentColor });
  currentY += 28;

  const cardGap = 16;
  const columns = team.length === 1 ? 1 : 2;
  const cardWidth = columns === 1 ? contentWidth : (contentWidth - cardGap) / 2;
  let rowY = currentY;
  let rowHeight = 0;

  team.forEach((member, memberIndex) => {
    const columnIndex = memberIndex % columns;
    const cardX = margin + columnIndex * (cardWidth + cardGap);
    const cardY = rowY;
    const rows = [
      { text: member.name, size: 21, weight: '700', color: darkColor },
      { text: member.role, size: 18, weight: '700' },
      { text: member.assignment, size: 17 },
      { text: [member.phone, member.email].filter(Boolean).join(' | '), size: 15, weight: '700' },
    ];
    const cardHeight = 138;
    drawDocumentCard(context, cardX, cardY, cardWidth, cardHeight, member.status || 'Available', rows, accentColor, '#ffffff', lineColor, fontScale);
    rowHeight = Math.max(rowHeight, cardHeight);
    if (columnIndex === columns - 1 || memberIndex === team.length - 1) {
      rowY += rowHeight + 14;
      rowHeight = 0;
    }
  });

  return rowY + 10;
}

async function drawLogo(context, state, margin, currentY) {
  const logoImage = await loadImage(state.logoSrc).catch(() => null);
  if (!logoImage) {
    return currentY;
  }

  const logoScale = BASE_DOCUMENT_WIDTH / PREVIEW_DOCUMENT_WIDTH;
  const logoWidth = Math.min(Number(state.logoWidth || 260) * logoScale, 760);
  const naturalRatio = (logoImage.naturalHeight || logoImage.height) / (logoImage.naturalWidth || logoImage.width);
  const logoMaxHeight = Math.min(Number(state.logoMaxHeight || 112) * logoScale, 220);
  const logoHeight = Math.min(logoWidth * naturalRatio, logoMaxHeight);
  const safeLogoWidth = logoHeight === logoWidth * naturalRatio ? logoWidth : logoWidth * (logoHeight / (logoWidth * naturalRatio));
  let logoX = (BASE_DOCUMENT_WIDTH - safeLogoWidth) / 2;

  if (state.logoAlign === 'left') {
    logoX = margin;
  }
  if (state.logoAlign === 'right') {
    logoX = BASE_DOCUMENT_WIDTH - margin - safeLogoWidth;
  }

  context.drawImage(logoImage, logoX, currentY, safeLogoWidth, logoHeight);
  return currentY + logoHeight + 28;
}

async function drawWatermark(context, state, documentHeight) {
  const watermarkImage = await loadImage(state.watermarkSrc).catch(() => null);
  if (!watermarkImage) {
    return;
  }

  const width = Math.min(Number(state.watermarkWidth || 420) * (BASE_DOCUMENT_WIDTH / PREVIEW_DOCUMENT_WIDTH), 900);
  const ratio = (watermarkImage.naturalHeight || watermarkImage.height) / (watermarkImage.naturalWidth || watermarkImage.width);
  const height = width * ratio;
  context.save();
  context.globalAlpha = Number(state.watermarkOpacity) || 0.06;
  context.drawImage(watermarkImage, (BASE_DOCUMENT_WIDTH - width) / 2, (documentHeight - height) / 2, width, height);
  context.restore();
}

function drawInfoCards(context, state, margin, currentY, contentWidth, accentColor, darkColor, lineColor, fontScale) {
  const cards = [];
  if (state.sections.client) {
    cards.push({
      title: state.labels.client,
      rows: [
        { text: state.clientName, size: 26, weight: '700', color: darkColor },
        { text: state.clientPerson, size: 19 },
        { text: [state.clientPhone, state.clientEmail].filter(Boolean).join(' | '), size: 18 },
        { text: state.clientAddress, size: 18 },
        { text: `Event: ${state.eventName}`, size: 18, weight: '700' },
        { text: `Venue: ${state.venue}`, size: 18, weight: '700' },
      ],
    });
  }
  if (state.sections.business) {
    cards.push({
      title: state.labels.business,
      rows: [
        { text: state.business.name, size: 24, weight: '700', color: darkColor },
        { text: [state.business.phone, state.business.email].filter(Boolean).join(' | '), size: 18 },
        { text: state.business.website, size: 18 },
        { text: state.business.location, size: 18 },
        { text: state.business.maps, size: 17, weight: '700', color: darkColor },
      ],
    });
  }

  if (!cards.length) {
    return currentY;
  }

  const cardGap = 24;
  const cardWidth = cards.length === 1 ? contentWidth : (contentWidth - cardGap) / 2;
  const cardHeight = 250;
  cards.forEach((card, index) => {
    drawDocumentCard(context, margin + index * (cardWidth + cardGap), currentY, cardWidth, cardHeight, card.title, card.rows, accentColor, '#ffffff', lineColor, fontScale);
  });
  return currentY + cardHeight + 34;
}

function drawCanvasTable(context, state, x, y, width, totals, accentColor, darkColor, lineColor, currency, locale, fontScale) {
  drawText(context, state.labels.items, x, y, { size: 17 * fontScale, weight: '700', color: accentColor });
  y += 28;

  const columns = {
    number: x + 34,
    description: x + 92,
    quantity: x + width - 360,
    rate: x + width - 190,
    amount: x + width - 34,
  };
  const headerHeight = 52;

  drawRoundRect(context, x, y, width, headerHeight, 14, darkColor, lineColor, 0);
  context.fillStyle = darkColor;
  context.fillRect(x, y + 24, width, headerHeight - 24);
  drawText(context, 'NO.', columns.number, y + 17, { size: 16 * fontScale, weight: '700', color: '#ffffff', align: 'center' });
  drawText(context, 'ITEM', columns.description, y + 17, { size: 16 * fontScale, weight: '700', color: '#ffffff' });
  drawText(context, 'QTY', columns.quantity, y + 17, { size: 16 * fontScale, weight: '700', color: '#ffffff', align: 'right' });
  drawText(context, 'RATE', columns.rate, y + 17, { size: 16 * fontScale, weight: '700', color: '#ffffff', align: 'right' });
  drawText(context, 'AMOUNT', columns.amount, y + 17, { size: 16 * fontScale, weight: '700', color: '#ffffff', align: 'right' });

  let rowY = y + headerHeight;
  state.items.forEach((item, itemIndex) => {
    setCanvasFont(context, 19 * fontScale);
    const description = [item.title, [item.category, item.name].filter(Boolean).join(' | '), item.description, item.notes].filter(Boolean).join('\n');
    const descriptionLines = wrapText(context, description.replaceAll('\n', ' '), width - 520);
    const rowHeight = Math.max(66, descriptionLines.length * 23 + 34);
    context.fillStyle = itemIndex % 2 === 0 ? '#ffffff' : '#fbfcfd';
    context.fillRect(x, rowY, width, rowHeight);
    context.strokeStyle = lineColor;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, rowY);
    context.lineTo(x + width, rowY);
    context.stroke();

    drawText(context, String(itemIndex + 1), columns.number, rowY + 20, { size: 19 * fontScale, weight: '700', color: darkColor, align: 'center' });
    drawWrappedText(context, description, columns.description, rowY + 16, width - 520, 23 * fontScale, { size: 18 * fontScale, color: '#343434' });
    drawText(context, `${Number(item.quantity) || 0} ${item.unit || ''}`, columns.quantity, rowY + 20, { size: 18 * fontScale, weight: '700', color: '#343434', align: 'right' });
    drawText(context, formatMoney(Number(item.unitPrice) || 0, currency, locale), columns.rate, rowY + 20, { size: 18 * fontScale, weight: '700', color: '#343434', align: 'right' });
    drawText(context, formatMoney(getItemTotal(item), currency, locale), columns.amount, rowY + 20, { size: 18 * fontScale, weight: '700', color: darkColor, align: 'right' });
    rowY += rowHeight;
  });

  const footerRows = [
    ['Subtotal', totals.itemSubtotal],
    ...(totals.itemDiscounts ? [['Item Discounts', totals.itemDiscounts]] : []),
    ...(totals.documentDiscount ? [['Document Discount', totals.documentDiscount]] : []),
    ...(totals.extraCharge ? [[state.extraChargeLabel || 'Extra Charge', totals.extraCharge]] : []),
    ...(totals.tax ? [[state.taxLabel || 'Tax / VAT', totals.tax]] : []),
  ];

  footerRows.forEach(([label, amount]) => {
    context.fillStyle = state.softColor || '#f6f6f4';
    context.fillRect(x, rowY, width, 48);
    context.strokeStyle = lineColor;
    context.beginPath();
    context.moveTo(x, rowY);
    context.lineTo(x + width, rowY);
    context.stroke();
    drawText(context, label, columns.rate - 190, rowY + 14, { size: 19 * fontScale, weight: '700', color: '#343434' });
    drawText(context, formatMoney(amount, currency, locale), columns.amount, rowY + 14, { size: 19 * fontScale, weight: '700', color: darkColor, align: 'right' });
    rowY += 48;
  });

  context.fillStyle = darkColor;
  context.fillRect(x, rowY, width, 66);
  context.fillStyle = accentColor;
  context.fillRect(x, rowY, 8, 66);
  drawText(context, state.labels.total, columns.description, rowY + 19, { size: 25 * fontScale, weight: '700', color: '#ffffff' });
  drawText(context, formatMoney(totals.total, currency, locale), columns.amount, rowY + 19, { size: 25 * fontScale, weight: '700', color: '#f4c35a', align: 'right' });
  rowY += 66;

  if (state.type === 'receipt' || totals.paid) {
    [[state.paidLabel || 'Amount Paid', totals.paid], ['Balance', totals.balance]].forEach(([label, amount]) => {
      context.fillStyle = '#ffffff';
      context.fillRect(x, rowY, width, 48);
      context.strokeStyle = lineColor;
      context.beginPath();
      context.moveTo(x, rowY);
      context.lineTo(x + width, rowY);
      context.stroke();
      drawText(context, label, columns.rate - 190, rowY + 14, { size: 19 * fontScale, weight: '700', color: '#343434' });
      drawText(context, formatMoney(amount, currency, locale), columns.amount, rowY + 14, { size: 19 * fontScale, weight: '700', color: darkColor, align: 'right' });
      rowY += 48;
    });
  }

  return rowY;
}

function drawNotePayment(context, state, margin, currentY, contentWidth, accentColor, darkColor, lineColor, fontScale) {
  const cards = [];
  if (state.sections.notes) {
    cards.push({ title: state.labels.note, rows: [{ text: state.note, size: 19 }], fill: '#fffcf5', stroke: '#e7d7a3' });
  }
  if (state.sections.payment) {
    cards.push({
      title: state.labels.payment,
      rows: [
        { text: `Method: ${state.paymentMethod}`, size: 19, weight: '700' },
        { text: `Bank: ${state.business.bank} ${state.business.account}`, size: 19, weight: '700' },
        { text: `Airtel Money: ${state.business.airtel}`, size: 19, weight: '700' },
      ],
      fill: '#ffffff',
      stroke: lineColor,
    });
  }

  if (!cards.length) {
    return currentY;
  }

  const cardGap = 24;
  const cardWidth = cards.length === 1 ? contentWidth : (contentWidth - cardGap) / 2;
  const noteHeight = 190;
  cards.forEach((card, index) => {
    drawDocumentCard(context, margin + index * (cardWidth + cardGap), currentY, cardWidth, noteHeight, card.title, card.rows, accentColor, card.fill, card.stroke, fontScale);
  });
  return currentY + noteHeight;
}

async function drawSignature(context, state, margin, currentY, contentWidth, darkColor, fontScale) {
  drawWrappedText(context, state.terms, margin, currentY, contentWidth - 380, 25 * fontScale, { size: 21 * fontScale, weight: '700', color: darkColor });
  const signatureX = BASE_DOCUMENT_WIDTH - margin - 320;
  const signatureImage = state.showSignature && state.signatureSrc ? await loadImage(state.signatureSrc).catch(() => null) : null;
  if (signatureImage) {
    const signatureWidth = Math.min(Number(state.signatureWidth || 180) * (BASE_DOCUMENT_WIDTH / PREVIEW_DOCUMENT_WIDTH), 340);
    const signatureHeight = signatureWidth * ((signatureImage.naturalHeight || signatureImage.height) / (signatureImage.naturalWidth || signatureImage.width));
    context.drawImage(signatureImage, signatureX + (320 - signatureWidth) / 2, currentY - 30, signatureWidth, Math.min(signatureHeight, 105));
  }
  context.strokeStyle = '#111111';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(signatureX, currentY + 95);
  context.lineTo(signatureX + 320, currentY + 95);
  context.stroke();
  drawText(context, `Authorized By: ${state.business.name}`, signatureX + 160, currentY + 112, { align: 'center', size: 17 * fontScale, weight: '700', color: '#343434' });
}

function drawDocumentCard(context, x, y, width, height, title, rows, accentColor, fillColor = '#ffffff', strokeColor = '#d9d5c8', fontScale = 1) {
  drawRoundRect(context, x, y, width, height, 14, fillColor, strokeColor, 2);
  context.fillStyle = accentColor;
  context.fillRect(x, y, width, 7);
  drawText(context, title, x + 24, y + 26, { size: 17 * fontScale, weight: '700', color: accentColor });

  let rowY = y + 62;
  rows.filter((row) => row.text).forEach((row) => {
    rowY = drawWrappedText(context, row.text, x + 24, rowY, width - 48, Math.max(23, (row.size || 18) * fontScale + 5), {
      size: (row.size || 18) * fontScale,
      weight: row.weight || '400',
      color: row.color || '#343434',
    });
    rowY += 3;
  });
}

function drawRoundRect(context, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();

  if (fillStyle) {
    context.fillStyle = fillStyle;
    context.fill();
  }
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function setCanvasFont(context, size, weight = '400') {
  context.font = `${weight} ${size}px ${activeCanvasFontFamily}`;
}

function measure(context, text, size, weight = '400') {
  setCanvasFont(context, size, weight);
  return context.measureText(String(text || '')).width;
}

function wrapText(context, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !currentLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length ? lines : [''];
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, options = {}) {
  setCanvasFont(context, options.size || 20, options.weight || '400');
  context.fillStyle = options.color || '#111111';
  context.textAlign = options.align || 'left';
  context.textBaseline = 'top';

  const paragraphs = String(text || '').split('\n');
  let currentY = y;
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const lines = wrapText(context, paragraph, maxWidth);
    lines.forEach((line) => {
      context.fillText(line, x, currentY);
      currentY += lineHeight;
    });
    if (paragraphIndex < paragraphs.length - 1) {
      currentY += lineHeight * 0.35;
    }
  });
  return currentY;
}

function drawText(context, text, x, y, options = {}) {
  setCanvasFont(context, options.size || 20, options.weight || '400');
  context.fillStyle = options.color || '#111111';
  context.textAlign = options.align || 'left';
  context.textBaseline = options.baseline || 'top';
  context.fillText(String(text || ''), x, y);
}
