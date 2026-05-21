export const DEFAULT_LOGO_SRC = 'assets/breezing-logo-web.png';
// Paper geometry. Defaults match F4 (Foolscap Folio, 210mm x 330mm).
// Width is shared with A4 so swapping paper sizes only changes the page height.
export const BASE_DOCUMENT_WIDTH = 1240;
export const BASE_DOCUMENT_HEIGHT = 1949;
export const PREVIEW_DOCUMENT_WIDTH = 794;
export const PREVIEW_DOCUMENT_HEIGHT = 1248;
export const STORAGE_KEY = 'breezing-studio-manager-layout';

// Supported paper sizes. cssWidth/cssHeight drive the on-screen preview (96dpi),
// canvasWidth/canvasHeight drive PNG/PDF rendering at ~150dpi, printSize feeds
// the @page rule in the Word/print export.
export const PAPER_SIZES = {
  F4: { id: 'F4', name: 'F4 (210 × 330 mm)', cssWidth: 794, cssHeight: 1248, canvasWidth: 1240, canvasHeight: 1949, printSize: '210mm 330mm' },
  A4: { id: 'A4', name: 'A4 (210 × 297 mm)', cssWidth: 794, cssHeight: 1123, canvasWidth: 1240, canvasHeight: 1754, printSize: 'A4' },
  Letter: { id: 'Letter', name: 'Letter (8.5 × 11 in)', cssWidth: 816, cssHeight: 1056, canvasWidth: 1275, canvasHeight: 1650, printSize: 'letter' },
};
export const DEFAULT_PAPER_SIZE = 'F4';
export function getPaperSize(id) {
  return PAPER_SIZES[id] || PAPER_SIZES[DEFAULT_PAPER_SIZE];
}

// Built-in visual styles that template variants can opt into. The matching CSS
// lives in styles.css under [data-variant-style="..."].
export const VARIANT_STYLES = ['classic', 'modern', 'minimal', 'bold'];

export const documentTypes = [
  { type: 'invoice', label: 'Invoice' },
  { type: 'quotation', label: 'Quotation' },
  { type: 'inquiry', label: 'Inquiry' },
  { type: 'receipt', label: 'Receipt' },
  { type: 'correction', label: 'Correction' },
];

export const defaultBusiness = {
  name: 'BREEZING PICTURES',
  tagline: 'Photography | Videography | Audio Coverage | Equipment Hire',
  phone: '099 374 1274',
  email: 'Breezingpix@gmail.com',
  website: 'Breezingpictures.com',
  location: 'Behind Petroda Filling Station, Mbayani, Blantyre',
  maps: 'https://g.page/breezing-pictures',
  bank: 'Bank Name',
  account: 'Account Number',
  airtel: 'Airtel Money Number',
};

export const defaultLabels = {
  client: 'BILL TO',
  business: 'BUSINESS DETAILS',
  items: 'SERVICE BREAKDOWN',
  note: 'SERVICE NOTE',
  payment: 'PAYMENT DETAILS',
  total: 'TOTAL AMOUNT',
};

export const defaultSections = {
  intro: true,
  client: true,
  business: true,
  team: true,
  items: true,
  notes: true,
  payment: true,
  signature: true,
  footerBar: true,
};

export const defaultLayout = {
  dock: 'left',
  zoom: 'fit',
  compact: false,
  darkMode: false,
};

export const brandThemes = [
  { id: 'classic-gold', name: 'Classic Gold', values: { accentColor: '#c9961a', darkColor: '#111111', paperColor: '#ffffff', softColor: '#f6f6f4', textColor: '#111111', lineColor: '#d9d5c8' } },
  { id: 'executive-slate', name: 'Executive Slate', values: { accentColor: '#4f7a8a', darkColor: '#18222c', paperColor: '#ffffff', softColor: '#eef3f8', textColor: '#111111', lineColor: '#cfd9e5' } },
  { id: 'studio-mono', name: 'Studio Mono', values: { accentColor: '#767676', darkColor: '#111111', paperColor: '#ffffff', softColor: '#f4f4f4', textColor: '#121212', lineColor: '#d8d8d8' } },
  { id: 'receipt-green', name: 'Receipt Green', values: { accentColor: '#2e6b35', darkColor: '#102317', paperColor: '#ffffff', softColor: '#f2faf2', textColor: '#111111', lineColor: '#cfe0d1' } },
];

export const fontPresets = [
  { id: 'arial-system', name: 'Clean System', fontFamily: 'Arial, Helvetica, sans-serif' },
  { id: 'georgia-editorial', name: 'Editorial Serif', fontFamily: 'Georgia, Times, serif' },
  { id: 'trebuchet-studio', name: 'Studio Sans', fontFamily: 'Trebuchet MS, Arial, sans-serif' },
  { id: 'courier-ledger', name: 'Ledger Mono', fontFamily: 'Courier New, monospace' },
];

export const logoPresets = [
  { id: 'primary-logo', name: 'Primary Centered', src: DEFAULT_LOGO_SRC, width: 260, maxHeight: 112, align: 'center' },
  { id: 'compact-header', name: 'Compact Header', src: DEFAULT_LOGO_SRC, width: 190, maxHeight: 82, align: 'left' },
  { id: 'statement-mark', name: 'Statement Mark', src: DEFAULT_LOGO_SRC, width: 340, maxHeight: 132, align: 'center' },
  { id: 'right-signed', name: 'Right Aligned', src: DEFAULT_LOGO_SRC, width: 230, maxHeight: 96, align: 'right' },
];

export const studioPresets = [
  { id: 'breezing-core', name: 'Breezing Core Studio', values: { tagline: 'Photography | Videography | Audio Coverage | Equipment Hire', paymentMethod: 'Bank Transfer / Airtel Money' } },
  { id: 'production-crew', name: 'Production Crew', values: { tagline: 'Creative Direction | Production Crew | Editing | Delivery', paymentMethod: 'Bank Transfer' } },
  { id: 'equipment-desk', name: 'Equipment Hire Desk', values: { tagline: 'Camera Equipment | Audio Kits | Stabilizers | Lighting Hire', paymentMethod: '50% deposit, balance before release' } },
  { id: 'events-unit', name: 'Events Coverage Unit', values: { tagline: 'Event Photography | Videography | Same-day Highlights', paymentMethod: 'Deposit required to confirm booking' } },
];

export const sharedDocumentDefaults = {
  subtitle: '',
  dueDate: '',
  preparedBy: 'Breezing Pictures',
  clientPerson: '',
  clientPhone: '',
  clientEmail: '',
  extraCharge: 0,
  extraChargeLabel: 'Extra Charge',
  paidLabel: 'Amount Paid',
  taxLabel: 'Tax / VAT',
  taxNumber: '',
  locale: 'en-MW',
  numberPrefix: 'BP',
  brandThemeId: 'classic-gold',
  logoPresetId: 'primary-logo',
  fontPresetId: 'arial-system',
  studioPresetId: 'breezing-core',
  fontFamily: 'Arial, Helvetica, sans-serif',
  sectionOrder: ['intro', 'cards', 'team', 'items', 'notes', 'signature'],
  paperSize: DEFAULT_PAPER_SIZE,
  variantStyle: 'classic',
  softColor: '#f6f6f4',
  textColor: '#111111',
  lineColor: '#d9d5c8',
  fontScale: 1,
  pagePadding: 60,
  logoSrc: DEFAULT_LOGO_SRC,
  logoWidth: 260,
  logoMaxHeight: 112,
  logoAlign: 'center',
  signatureSrc: '',
  signatureWidth: 180,
  showSignature: false,
  watermarkSrc: DEFAULT_LOGO_SRC,
  watermarkWidth: 420,
  watermarkOpacity: 0.06,
  showWatermark: false,
};

export const templates = {
  invoice: {
    type: 'invoice',
    title: 'INVOICE',
    number: 'BP-2026-001',
    date: '2026-05-18',
    status: 'PENDING PAYMENT',
    currency: 'MK',
    clientName: 'Client Name',
    clientAddress: 'Client address or organization',
    eventName: 'Project / Event Name',
    venue: 'Venue or location',
    intro: '',
    note: 'Professional studio services, editing, and delivery details can be recorded here.',
    terms: 'Thank you for choosing Breezing Pictures. We appreciate your trust and continued partnership.',
    paymentMethod: 'Bank Transfer / Airtel Money',
    reference: '',
    discount: 0,
    taxRate: 0,
    amountPaid: 0,
    accentColor: '#c9961a',
    darkColor: '#111111',
    paperColor: '#ffffff',
    labels: { ...defaultLabels, client: 'BILL TO', items: 'SERVICE BREAKDOWN' },
    items: [
      { category: 'Service', title: 'Studio Service', name: 'Service item', description: 'Describe the service, product, or coverage here.', quantity: 1, unit: 'job', unitPrice: 0, discount: 0, notes: '' },
      { category: 'Delivery', title: 'Editing & Delivery', name: 'Delivery item', description: 'Describe editing, delivery, and any included extras.', quantity: 1, unit: 'job', unitPrice: 0, discount: 0, notes: '' },
    ],
  },
  quotation: {
    type: 'quotation',
    title: 'EQUIPMENT HIRE QUOTATION',
    number: 'BP-Q-2026-001',
    date: '2026-05-21',
    status: 'VALID FOR EQUIPMENT HIRE',
    currency: 'MWK',
    clientName: 'Client Name',
    clientAddress: '',
    eventName: 'Equipment Hire',
    venue: 'Blantyre',
    intro: 'Thank you for your inquiry. Please find below our quotation for the requested equipment hire services.',
    note: 'We look forward to working with you. Thank you for choosing Breezing Pictures.',
    terms: 'Prepared By: BREEZING PICTURES',
    paymentMethod: 'Bank Transfer / Airtel Money',
    reference: '',
    discount: 0,
    taxRate: 0,
    amountPaid: 0,
    accentColor: '#b8872c',
    darkColor: '#0e2742',
    paperColor: '#ffffff',
    labels: { ...defaultLabels, client: 'QUOTED TO', items: 'EQUIPMENT DESCRIPTION' },
    items: [
      { category: 'Camera', title: 'Sony A6400 Camera', name: 'Camera Body', description: 'Mirrorless camera body for 4K production.', quantity: 1, unit: 'day', unitPrice: 80000, discount: 0, notes: '' },
      { category: 'Stabilizer', title: 'Gimbal Stabilizer', name: 'Gimbal', description: 'Stabilizer for smooth camera movement.', quantity: 1, unit: 'day', unitPrice: 50000, discount: 0, notes: '' },
      { category: 'Lenses', title: 'Two Camera Lenses', name: '16mm & 30mm', description: 'Two camera lenses for wide and normal coverage.', quantity: 1, unit: 'day', unitPrice: 100000, discount: 0, notes: '' },
      { category: 'Storage', title: '4K Memory Card', name: 'Memory Card', description: 'High-speed storage for 4K recording.', quantity: 1, unit: 'day', unitPrice: 50000, discount: 0, notes: '' },
    ],
  },
  inquiry: {
    type: 'inquiry',
    title: 'SERVICE INQUIRY',
    number: 'BP-I-2026-001',
    date: '2026-05-21',
    status: 'NEW INQUIRY',
    currency: 'MWK',
    clientName: 'Client Name',
    clientPerson: 'Contact Person',
    clientPhone: 'Phone number',
    clientEmail: 'Email address',
    clientAddress: 'Organization or address',
    eventName: 'Event / Project Name',
    venue: 'Venue or location',
    intro: 'Inquiry received for Breezing Pictures studio services.',
    note: 'Record client requirements, expected coverage time, delivery needs, and any special notes here.',
    terms: 'Prepared for internal studio follow-up.',
    paymentMethod: 'Not confirmed',
    reference: '',
    discount: 0,
    taxRate: 0,
    amountPaid: 0,
    accentColor: '#c9961a',
    darkColor: '#0e2742',
    paperColor: '#ffffff',
    labels: { ...defaultLabels, client: 'INQUIRY FROM', items: 'REQUESTED SERVICES' },
    items: [
      { category: 'Photography', title: 'Photography Coverage Inquiry', name: 'Coverage request', description: 'Client is asking for photography coverage details.', quantity: 1, unit: 'request', unitPrice: 0, discount: 0, notes: 'Confirm date, venue, number of hours, and delivery needs.' },
      { category: 'Video / Audio', title: 'Videography / Audio Requirements', name: 'Production request', description: 'Record requested video, audio, and editing requirements.', quantity: 1, unit: 'request', unitPrice: 0, discount: 0, notes: '' },
    ],
  },
  receipt: {
    type: 'receipt',
    title: 'RECEIPT',
    number: 'BP-R-2026-001',
    date: '2026-05-21',
    status: 'PAID',
    currency: 'MK',
    clientName: 'Client Name',
    clientAddress: '',
    eventName: 'Photography Coverage',
    venue: 'Blantyre',
    intro: 'Payment received with thanks.',
    note: 'This receipt confirms payment received for the services listed below.',
    terms: 'Authorized By: Breezing Pictures',
    paymentMethod: 'Airtel Money',
    reference: 'Receipt payment reference',
    discount: 0,
    taxRate: 0,
    amountPaid: 200000,
    accentColor: '#c9961a',
    darkColor: '#111111',
    paperColor: '#ffffff',
    labels: { ...defaultLabels, client: 'RECEIVED FROM', items: 'PAYMENT BREAKDOWN' },
    items: [
      { category: 'Coverage', title: 'Photography Coverage', name: 'Receipt Item', description: 'Photography coverage, editing, and delivery.', quantity: 1, unit: 'job', unitPrice: 200000, discount: 0, notes: '' },
    ],
  },
  correction: {
    type: 'correction',
    title: 'CORRECTION NOTE',
    number: 'BP-CRN-2026-001',
    date: '2026-05-21',
    status: 'ISSUED FOR CORRECTION',
    currency: 'MK',
    clientName: 'Client Name',
    clientAddress: '',
    eventName: 'Correction / Adjustment',
    venue: 'Studio Office',
    intro: 'This document records an adjustment, correction, credit, or revised studio charge.',
    note: 'Reference the original document number and describe the correction clearly for audit tracking.',
    terms: 'Authorized By: Breezing Pictures',
    paymentMethod: 'Adjustment note',
    reference: 'Original document reference',
    discount: 0,
    taxRate: 0,
    amountPaid: 0,
    accentColor: '#4f7a8a',
    darkColor: '#18222c',
    paperColor: '#ffffff',
    labels: { ...defaultLabels, client: 'ISSUED TO', items: 'CORRECTION DETAILS', total: 'ADJUSTMENT TOTAL' },
    items: [
      { category: 'Adjustment', title: 'Document Correction', name: 'Correction item', description: 'Describe the corrected charge, credit, or adjustment.', quantity: 1, unit: 'item', unitPrice: 0, discount: 0, notes: '' },
    ],
  },
};

export const templateVariants = {
  invoice: [
    { id: 'invoice-classic', name: 'Classic Service Invoice', data: { title: 'INVOICE', status: 'PENDING PAYMENT', variantStyle: 'classic', labels: { ...defaultLabels, client: 'BILL TO', items: 'SERVICE BREAKDOWN' } } },
    { id: 'invoice-commercial', name: 'Commercial Production Invoice', data: { title: 'PRODUCTION INVOICE', subtitle: 'Commercial studio services', status: 'PAYMENT DUE', variantStyle: 'modern', accentColor: '#4f7a8a', darkColor: '#18222c', labels: { ...defaultLabels, items: 'PRODUCTION CHARGES' } } },
    { id: 'invoice-retainer', name: 'Retainer Invoice', data: { title: 'RETAINER INVOICE', subtitle: 'Booking confirmation and retainer', status: 'DEPOSIT REQUIRED', variantStyle: 'minimal', paymentMethod: 'Deposit required to confirm booking', labels: { ...defaultLabels, total: 'RETAINER DUE' } } },
    { id: 'invoice-final', name: 'Final Balance Invoice', data: { title: 'FINAL INVOICE', status: 'BALANCE DUE', variantStyle: 'bold', paidLabel: 'Deposit Received', labels: { ...defaultLabels, total: 'FINAL TOTAL' } } },
  ],
  quotation: [
    { id: 'quotation-equipment', name: 'Equipment Hire Quotation', data: { title: 'EQUIPMENT HIRE QUOTATION', variantStyle: 'classic', labels: { ...defaultLabels, client: 'QUOTED TO', items: 'EQUIPMENT DESCRIPTION' } } },
    { id: 'quotation-service', name: 'Service Proposal Quote', data: { title: 'SERVICE QUOTATION', subtitle: 'Studio service estimate', status: 'VALID FOR REVIEW', variantStyle: 'modern', labels: { ...defaultLabels, items: 'SERVICE PROPOSAL' } } },
    { id: 'quotation-event', name: 'Event Coverage Quote', data: { title: 'EVENT COVERAGE QUOTATION', status: 'VALID FOR EVENT DATE', variantStyle: 'minimal', accentColor: '#2e6b35', labels: { ...defaultLabels, items: 'COVERAGE PACKAGE' } } },
    { id: 'quotation-retainer', name: 'Retainer Estimate', data: { title: 'RETAINER ESTIMATE', status: 'SUBJECT TO APPROVAL', variantStyle: 'bold', labels: { ...defaultLabels, total: 'ESTIMATED TOTAL' } } },
  ],
  inquiry: [
    { id: 'inquiry-standard', name: 'Standard Inquiry', data: { title: 'SERVICE INQUIRY', variantStyle: 'classic', labels: { ...defaultLabels, client: 'INQUIRY FROM', items: 'REQUESTED SERVICES' } } },
    { id: 'inquiry-booking', name: 'Booking Lead', data: { title: 'BOOKING INQUIRY', status: 'NEW BOOKING LEAD', variantStyle: 'modern', labels: { ...defaultLabels, items: 'BOOKING REQUIREMENTS' } } },
    { id: 'inquiry-equipment', name: 'Equipment Request', data: { title: 'EQUIPMENT INQUIRY', status: 'EQUIPMENT REQUEST', variantStyle: 'minimal', labels: { ...defaultLabels, items: 'REQUESTED EQUIPMENT' } } },
    { id: 'inquiry-follow-up', name: 'Follow-up Sheet', data: { title: 'CLIENT FOLLOW-UP', status: 'FOLLOW-UP REQUIRED', variantStyle: 'bold', labels: { ...defaultLabels, total: 'ESTIMATED VALUE' } } },
  ],
  receipt: [
    { id: 'receipt-payment', name: 'Payment Receipt', data: { title: 'RECEIPT', variantStyle: 'classic', labels: { ...defaultLabels, client: 'RECEIVED FROM', items: 'PAYMENT BREAKDOWN' } } },
    { id: 'receipt-deposit', name: 'Deposit Receipt', data: { title: 'DEPOSIT RECEIPT', status: 'DEPOSIT RECEIVED', variantStyle: 'modern', paidLabel: 'Deposit Received', labels: { ...defaultLabels, total: 'DEPOSIT TOTAL' } } },
    { id: 'receipt-balance', name: 'Balance Receipt', data: { title: 'BALANCE RECEIPT', status: 'BALANCE RECEIVED', variantStyle: 'minimal', labels: { ...defaultLabels, total: 'BALANCE PAID' } } },
    { id: 'receipt-refund', name: 'Refund Receipt', data: { title: 'REFUND RECEIPT', status: 'REFUND ISSUED', variantStyle: 'bold', accentColor: '#4f7a8a', labels: { ...defaultLabels, items: 'REFUND BREAKDOWN', total: 'REFUND TOTAL' } } },
  ],
  correction: [
    { id: 'correction-note', name: 'Correction Note', data: { title: 'CORRECTION NOTE', variantStyle: 'classic', labels: { ...defaultLabels, client: 'ISSUED TO', items: 'CORRECTION DETAILS', total: 'ADJUSTMENT TOTAL' } } },
    { id: 'correction-credit', name: 'Credit Note', data: { title: 'CREDIT NOTE', status: 'CREDIT ISSUED', variantStyle: 'modern', accentColor: '#2e6b35', labels: { ...defaultLabels, items: 'CREDIT DETAILS', total: 'CREDIT TOTAL' } } },
    { id: 'correction-revision', name: 'Revision Note', data: { title: 'REVISION NOTE', status: 'REVISED DOCUMENT', variantStyle: 'minimal', labels: { ...defaultLabels, items: 'REVISION DETAILS' } } },
    { id: 'correction-cancel', name: 'Cancellation Note', data: { title: 'CANCELLATION NOTE', status: 'CANCELLED / VOIDED', variantStyle: 'bold', accentColor: '#a13d2d', labels: { ...defaultLabels, items: 'CANCELLATION DETAILS' } } },
  ],
};

export function getTemplateVariant(type, variantId) {
  const variants = templateVariants[type] || templateVariants.invoice;
  return variants.find((variant) => variant.id === variantId) || variants[0];
}
