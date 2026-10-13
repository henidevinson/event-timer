import { EvaluationFileRecord } from '../types';

const DB_NAME = 'ideathon_live_db';
const DB_VERSION = 1;
const STORE_NAME = 'evaluation_files';
const CURRENT_FILE_KEY = 'active_evaluation_file';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };
  });
}

export async function saveEvaluationFile(file: File): Promise<EvaluationFileRecord> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const extension: EvaluationFileRecord['extension'] = 
    ext === 'pdf' ? 'pdf' :
    ext === 'xlsx' ? 'xlsx' :
    ext === 'xls' ? 'xls' :
    ext === 'csv' ? 'csv' : 'unknown';

  const record: EvaluationFileRecord = {
    id: CURRENT_FILE_KEY,
    name: file.name,
    size: file.size,
    type: file.type || 'application/octet-stream',
    extension,
    uploadedAt: Date.now(),
    blob: file,
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(new Error('Failed to save file to IndexedDB'));
  });
}

export async function getActiveEvaluationFile(): Promise<EvaluationFileRecord | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(CURRENT_FILE_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(new Error('Failed to load file from IndexedDB'));
    });
  } catch (error) {
    console.error('Error fetching evaluation file:', error);
    return null;
  }
}

export async function deleteEvaluationFile(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(CURRENT_FILE_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete file from IndexedDB'));
  });
}
