const DB_NAME = 'breezing-studio-manager';
const DB_VERSION = 1;
const DRAFT_ID = 'active-draft';
const VERSION_LIMIT = 30;

let dbPromise;

export function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}

export async function saveDraft(state) {
  const db = await openDb();
  const record = {
    id: DRAFT_ID,
    documentId: state.documentId,
    type: state.type,
    number: state.number,
    title: state.title,
    updatedAt: new Date().toISOString(),
    state,
  };
  await putRecord(db, 'drafts', record);
  return record;
}

export async function loadDraft() {
  const db = await openDb();
  const record = await getRecord(db, 'drafts', DRAFT_ID);
  return record?.state || null;
}

export async function saveVersion(state, reason = 'Manual snapshot', options = {}) {
  const db = await openDb();
  const record = {
    id: `${state.documentId || 'document'}-${Date.now()}`,
    documentId: state.documentId,
    type: state.type,
    number: state.number,
    title: state.title,
    reason,
    savedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)),
  };
  await putRecord(db, 'versions', record);
  await trimVersions(db, state.documentId, Number(options.limit) || VERSION_LIMIT);
  return record;
}

export async function listVersions(documentId) {
  const db = await openDb();
  const records = await getAllRecords(db, 'versions');
  return records
    .filter((record) => !documentId || record.documentId === documentId)
    .sort((first, second) => String(second.savedAt).localeCompare(String(first.savedAt)));
}

export async function loadVersion(versionId) {
  const db = await openDb();
  const record = await getRecord(db, 'versions', versionId);
  return record?.state || null;
}

export async function getNextDocumentNumber(type, prefix = 'BP') {
  const db = await openDb();
  const counterId = type || 'document';
  const existing = await getRecord(db, 'counters', counterId);
  const nextValue = Number(existing?.nextValue || 1);
  await putRecord(db, 'counters', { id: counterId, nextValue: nextValue + 1, updatedAt: new Date().toISOString() });
  const typeCode = getTypeCode(type);
  return `${prefix}-${typeCode}-${new Date().getFullYear()}-${String(nextValue).padStart(3, '0')}`;
}

function getTypeCode(type) {
  return {
    invoice: 'INV',
    quotation: 'QTN',
    inquiry: 'INQ',
    receipt: 'RCT',
    correction: 'CRN',
  }[type] || 'DOC';
}

function openDb() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('versions')) {
        const versions = db.createObjectStore('versions', { keyPath: 'id' });
        versions.createIndex('documentId', 'documentId', { unique: false });
        versions.createIndex('savedAt', 'savedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('counters')) {
        db.createObjectStore('counters', { keyPath: 'id' });
      }
    });
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
  return dbPromise;
}

function putRecord(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value);
    transaction.addEventListener('complete', () => resolve(value));
    transaction.addEventListener('error', () => reject(transaction.error));
  });
}

function getRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error));
  });
}

function getAllRecords(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    request.addEventListener('success', () => resolve(request.result || []));
    request.addEventListener('error', () => reject(request.error));
  });
}

async function trimVersions(db, documentId, limit = VERSION_LIMIT) {
  const records = (await getAllRecords(db, 'versions'))
    .filter((record) => record.documentId === documentId)
    .sort((first, second) => String(second.savedAt).localeCompare(String(first.savedAt)));
  const staleRecords = records.slice(Math.max(1, limit));
  if (!staleRecords.length) {
    return;
  }

  await new Promise((resolve, reject) => {
    const transaction = db.transaction('versions', 'readwrite');
    const store = transaction.objectStore('versions');
    staleRecords.forEach((record) => store.delete(record.id));
    transaction.addEventListener('complete', resolve);
    transaction.addEventListener('error', () => reject(transaction.error));
  });
}
