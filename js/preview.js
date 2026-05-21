import { calculateTotals, escapeHtml, formatDate, formatMoney, getItemSubtotal, getItemTotal, isPaidStatus, multilineHtml } from './utils.js?v=40acf6c';

export function renderPreview(state, documentPreview, previewName) {
  if (!documentPreview) {
    return;
  }

  const totals = calculateTotals(state);
  const statusClass = isPaidStatus(state) ? 'doc-status paid' : 'doc-status';
  const safeLogoAlign = ['left', 'center', 'right'].includes(state.logoAlign) ? state.logoAlign : 'center';
  const labels = state.labels || {};
  const sections = state.sections || {};
  const currency = state.currency || 'MWK';

  documentPreview.style.setProperty('--doc-accent', state.accentColor || '#c9961a');
  documentPreview.style.setProperty('--doc-dark', state.darkColor || '#111111');
  documentPreview.style.setProperty('--doc-paper', state.paperColor || '#ffffff');
  documentPreview.style.setProperty('--doc-soft', state.softColor || '#f6f6f4');
  documentPreview.style.setProperty('--doc-text', state.textColor || '#111111');
  documentPreview.style.setProperty('--doc-line', state.lineColor || '#d9d5c8');
  documentPreview.style.setProperty('--logo-width', `${Number(state.logoWidth) || 260}px`);
  documentPreview.style.setProperty('--logo-max-height', `${Number(state.logoMaxHeight) || 112}px`);
  documentPreview.style.setProperty('--signature-width', `${Number(state.signatureWidth) || 180}px`);
  documentPreview.style.setProperty('--watermark-width', `${Number(state.watermarkWidth) || 420}px`);
  documentPreview.style.setProperty('--watermark-opacity', `${Number(state.watermarkOpacity) || 0.06}`);
  documentPreview.style.setProperty('--font-scale', `${Number(state.fontScale) || 1}`);
  documentPreview.style.setProperty('--page-padding', `${Number(state.pagePadding) || 60}px`);
  documentPreview.style.setProperty('--doc-font-family', state.fontFamily || 'Arial, Helvetica, sans-serif');
  documentPreview.dataset.type = state.type;

  if (previewName) {
    previewName.textContent = `${state.title || 'Document'} ${state.number || ''}`.trim();
  }

  const logoMarkup = state.logoSrc
    ? `<div class="doc-logo-row ${safeLogoAlign}"><img class="doc-logo" src="${escapeHtml(state.logoSrc)}" alt="${escapeHtml(state.business.name)} logo"></div>`
    : '';
  const watermarkMarkup = state.showWatermark && state.watermarkSrc
    ? `<div class="doc-watermark" aria-hidden="true"><img src="${escapeHtml(state.watermarkSrc)}" alt=""></div>`
    : '';
  const signatureImageMarkup = state.showSignature && state.signatureSrc
    ? `<img src="${escapeHtml(state.signatureSrc)}" alt="Signature or stamp">`
    : '';

  const clientCard = sections.client ? `
    <article class="doc-card">
      <span class="doc-card-title">${escapeHtml(labels.client)}</span>
      <h3>${escapeHtml(state.clientName)}</h3>
      ${state.clientPerson ? `<p>${escapeHtml(state.clientPerson)}</p>` : ''}
      ${state.clientPhone || state.clientEmail ? `<p>${escapeHtml([state.clientPhone, state.clientEmail].filter(Boolean).join(' | '))}</p>` : ''}
      ${state.clientAddress ? `<p>${escapeHtml(state.clientAddress)}</p>` : ''}
      <div class="doc-mini-grid">
        <div><span class="doc-small-label">Event</span><strong>${escapeHtml(state.eventName)}</strong></div>
        <div><span class="doc-small-label">Venue</span><strong>${escapeHtml(state.venue)}</strong></div>
      </div>
    </article>
  ` : '';

  const businessCard = sections.business ? `
    <article class="doc-card">
      <span class="doc-card-title">${escapeHtml(labels.business)}</span>
      <h3>${escapeHtml(state.business.name)}</h3>
      <p>${escapeHtml([state.business.phone, state.business.email].filter(Boolean).join(' | '))}</p>
      <p>${escapeHtml(state.business.website)}</p>
      <p>${escapeHtml(state.business.location)}</p>
      ${state.business.maps ? `<p>${escapeHtml(state.business.maps)}</p>` : ''}
      ${state.taxNumber ? `<p>${escapeHtml(state.taxLabel || 'Tax / VAT')}: ${escapeHtml(state.taxNumber)}</p>` : ''}
    </article>
  ` : '';

  const infoCards = [clientCard, businessCard].filter(Boolean).join('');
  const infoGridClass = [clientCard, businessCard].filter(Boolean).length === 1 ? 'doc-info-grid single-card' : 'doc-info-grid';
  const sectionMarkup = {
    cards: infoCards ? `<section class="${infoGridClass}">${infoCards}</section>` : '',
    team: sections.team ? renderTeamSection(state) : '',
    intro: sections.intro && state.intro ? `<section class="doc-intro"><p>${multilineHtml(state.intro)}</p></section>` : '',
    items: sections.items ? renderItemsTable(state, totals, labels, currency) : '',
    notes: renderNotePaymentGrid(state, labels, sections),
    signature: sections.signature ? renderSignature(state, signatureImageMarkup) : '',
  };
  const orderedSections = (state.sectionOrder || ['intro', 'cards', 'team', 'items', 'notes', 'signature'])
    .map((key) => sectionMarkup[key] || '')
    .join('');

  documentPreview.innerHTML = `
    <div class="doc-bars" aria-hidden="true"></div>
    ${watermarkMarkup}
    <header class="doc-brand">
      ${logoMarkup}
      <h2 class="doc-business-name">${escapeHtml(state.business.name)}</h2>
      <p class="doc-tagline">${escapeHtml(state.business.tagline)}</p>
      ${state.subtitle ? `<p class="doc-subtitle">${escapeHtml(state.subtitle)}</p>` : ''}
    </header>

    <div class="doc-rule" aria-hidden="true"></div>

    <section class="doc-title-grid">
      <h2 class="doc-title">${escapeHtml(state.title)}</h2>
      <div class="doc-meta">
        <span>No. ${escapeHtml(state.number)}</span>
        <span>Date: ${escapeHtml(formatDate(state.date))}</span>
        ${state.dueDate ? `<span>Due/Event: ${escapeHtml(formatDate(state.dueDate))}</span>` : ''}
        ${state.reference ? `<span>Ref: ${escapeHtml(state.reference)}</span>` : ''}
        ${state.preparedBy ? `<span>Prepared By: ${escapeHtml(state.preparedBy)}</span>` : ''}
        <span class="${statusClass}">${escapeHtml(state.status)}</span>
      </div>
    </section>

    ${orderedSections}
    ${sections.footerBar ? '<div class="doc-footer-bar" aria-hidden="true"></div>' : ''}
  `;
}

function renderTeamSection(state) {
  const team = Array.isArray(state.team) ? state.team.filter((member) => member.name || member.role || member.assignment) : [];
  if (!team.length) {
    return '';
  }

  return `
    <section class="doc-team">
      <div class="doc-table-label">Production Team</div>
      <div class="doc-team-grid">
        ${team.map((member) => `
          <article class="doc-team-member">
            <span>${escapeHtml(member.status || 'Available')}</span>
            <h3>${escapeHtml(member.name)}</h3>
            <p>${escapeHtml(member.role)}</p>
            ${member.assignment ? `<p>${multilineHtml(member.assignment)}</p>` : ''}
            ${member.phone || member.email ? `<small>${escapeHtml([member.phone, member.email].filter(Boolean).join(' | '))}</small>` : ''}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function renderItemsTable(state, totals, labels, currency) {
  const locale = state.locale || 'en-MW';
  return `
    <section class="doc-table-wrap">
      <div class="doc-table-label">${escapeHtml(labels.items)}</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${state.items.map((item, itemIndex) => `
            <tr>
              <td>${itemIndex + 1}</td>
              <td>
                <span class="doc-item-title">${escapeHtml(item.title || item.name || item.description)}</span>
                ${item.category || item.name ? `<span class="doc-item-meta">${escapeHtml([item.category, item.name].filter(Boolean).join(' | '))}</span>` : ''}
                ${item.description ? `<span class="doc-item-meta">${escapeHtml(item.description)}</span>` : ''}
                ${item.notes ? `<span class="doc-item-notes">${escapeHtml(item.notes)}</span>` : ''}
              </td>
              <td>${Number(item.quantity) || 0} ${escapeHtml(item.unit || '')}</td>
              <td>${formatMoney(Number(item.unitPrice) || 0, currency, locale)}</td>
              <td>${formatMoney(getItemTotal(item), currency, locale)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="4">Subtotal</td><td>${formatMoney(totals.itemSubtotal, currency, locale)}</td></tr>
          ${totals.itemDiscounts ? `<tr><td colspan="4">Item Discounts</td><td>${formatMoney(totals.itemDiscounts, currency, locale)}</td></tr>` : ''}
          ${totals.documentDiscount ? `<tr><td colspan="4">Document Discount</td><td>${formatMoney(totals.documentDiscount, currency, locale)}</td></tr>` : ''}
          ${totals.extraCharge ? `<tr><td colspan="4">${escapeHtml(state.extraChargeLabel || 'Extra Charge')}</td><td>${formatMoney(totals.extraCharge, currency, locale)}</td></tr>` : ''}
          ${totals.tax ? `<tr><td colspan="4">${escapeHtml(state.taxLabel || 'Tax / VAT')}</td><td>${formatMoney(totals.tax, currency, locale)}</td></tr>` : ''}
          <tr class="doc-grand-total"><td colspan="4">${escapeHtml(labels.total)}</td><td>${formatMoney(totals.total, currency, locale)}</td></tr>
          ${state.type === 'receipt' || totals.paid ? `<tr><td colspan="4">${escapeHtml(state.paidLabel || 'Amount Paid')}</td><td>${formatMoney(totals.paid, currency, locale)}</td></tr>` : ''}
          ${state.type === 'receipt' || totals.paid ? `<tr><td colspan="4">Balance</td><td>${formatMoney(totals.balance, currency, locale)}</td></tr>` : ''}
        </tfoot>
      </table>
    </section>
  `;
}

function renderNotePaymentGrid(state, labels, sections) {
  const noteCard = sections.notes ? `
    <article class="doc-note">
      <span class="doc-card-title">${escapeHtml(labels.note)}</span>
      <p>${multilineHtml(state.note)}</p>
    </article>
  ` : '';

  const paymentCard = sections.payment ? `
    <article class="doc-payment">
      <span class="doc-card-title">${escapeHtml(labels.payment)}</span>
      <dl>
        <div><dt>Method</dt><dd>${escapeHtml(state.paymentMethod)}</dd></div>
        <div><dt>Bank</dt><dd>${escapeHtml(state.business.bank)} ${escapeHtml(state.business.account)}</dd></div>
        <div><dt>Airtel</dt><dd>${escapeHtml(state.business.airtel)}</dd></div>
        ${state.taxNumber ? `<div><dt>${escapeHtml(state.taxLabel || 'Tax / VAT')}</dt><dd>${escapeHtml(state.taxNumber)}</dd></div>` : ''}
      </dl>
    </article>
  ` : '';

  const cards = [noteCard, paymentCard].filter(Boolean);
  if (!cards.length) {
    return '';
  }

  return `<section class="${cards.length === 1 ? 'doc-note-grid single-card' : 'doc-note-grid'}">${cards.join('')}</section>`;
}

function renderSignature(state, signatureImageMarkup) {
  return `
    <section class="doc-signature-grid">
      <p class="doc-footer-text">${multilineHtml(state.terms)}</p>
      <div class="signature-box">
        ${signatureImageMarkup}
        <div class="signature-line">Authorized By: ${escapeHtml(state.business.name)}</div>
      </div>
    </section>
  `;
}
