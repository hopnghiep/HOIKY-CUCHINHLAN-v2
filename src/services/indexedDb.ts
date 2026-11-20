import type { MemoirDatabase } from '../types/memoir';
import { getAdminAuthHeaders } from './authToken';

const DB_NAME = 'hoiky_cuchinhlan_db';
const DB_VERSION = 1;
const STORE_STATE = 'memoir_state';
const STORE_BACKUPS = 'pre_restore_backups';
const STATE_KEY = 'current_database';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Trình duyệt không hỗ trợ IndexedDB.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
      if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
        db.createObjectStore(STORE_BACKUPS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không thể mở IndexedDB.'));
  });
}

export async function loadMemoirFromIndexedDB(): Promise<MemoirDatabase | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readonly');
      const store = tx.objectStore(STORE_STATE);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve((req.result as MemoirDatabase) || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveMemoirToIndexedDB(data: MemoirDatabase): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_STATE, 'readwrite');
    const store = tx.objectStore(STORE_STATE);
    const req = store.put(data, STATE_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export interface LocalBackupSnapshot {
  id: string;
  createdAt: string;
  reason: string;
  data: MemoirDatabase;
}

export async function savePreRestoreBackup(data: MemoirDatabase, reason: string): Promise<LocalBackupSnapshot> {
  const db = await openDb();
  const snapshot: LocalBackupSnapshot = {
    id: `backup_${Date.now()}`,
    createdAt: new Date().toISOString(),
    reason,
    data,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BACKUPS, 'readwrite');
    const store = tx.objectStore(STORE_BACKUPS);
    const req = store.put(snapshot);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return snapshot;
}

export async function listPreRestoreBackups(): Promise<LocalBackupSnapshot[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BACKUPS, 'readonly');
      const store = tx.objectStore(STORE_BACKUPS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as LocalBackupSnapshot[]) || [];
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(items.slice(0, 10));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp đã chọn.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadOrEncodeMedia(
  file: File,
  kind: 'image' | 'video'
): Promise<{ url: string; mimeType: string }> {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const validVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const mime = file.type.toLowerCase();

  if (kind === 'image' && !validImageTypes.includes(mime)) {
    throw new Error('Chỉ hỗ trợ định dạng ảnh JPG, JPEG, PNG hoặc WEBP.');
  }
  if (kind === 'video' && !validVideoTypes.includes(mime)) {
    throw new Error('Chỉ hỗ trợ định dạng video MP4 hoặc WEBM.');
  }

  const dataUrl = await readFileAsDataUrl(file);

  // Attempt persistent upload on Express server; fall back cleanly to data URL stored in IndexedDB
  try {
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify({ dataUrl, fileName: file.name }),
    });
    if (res.ok) {
      const json = (await res.json()) as { url: string; mimeType: string };
      return { url: json.url, mimeType: json.mimeType };
    }
    if (kind === 'image') {
      const memberRes = await fetch('/api/media/member-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, fileName: file.name }),
      });
      if (memberRes.ok) {
        const json = (await memberRes.json()) as { url: string; mimeType: string };
        return { url: json.url, mimeType: json.mimeType };
      }
    }
  } catch {
    // Fallback to inline data URL when offline
  }

  return { url: dataUrl, mimeType: mime };
}

export async function uploadOrEncodeDocument(
  file: File
): Promise<{ url: string; mimeType: string; fileName: string; sizeBytes: number }> {
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('Dung lượng tài liệu vượt quá giới hạn 20MB.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const mimeType = file.type || 'application/octet-stream';

  try {
    const res = await fetch('/api/media/member-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, fileName: file.name, mimeType }),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        url: string;
        mimeType?: string;
        fileName?: string;
        sizeBytes?: number;
      };
      return {
        url: json.url,
        mimeType: json.mimeType || mimeType,
        fileName: json.fileName || file.name,
        sizeBytes: json.sizeBytes ?? file.size,
      };
    }
    const errJson = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status >= 400 && res.status < 500 && errJson.error) {
      throw new Error(errJson.error);
    }
  } catch (err) {
    if (err instanceof Error && err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Offline fallback for small files
  if (file.size > 4 * 1024 * 1024) {
    throw new Error('Không thể tải tài liệu lớn lên máy chủ khi ngoại tuyến.');
  }
  return { url: dataUrl, mimeType, fileName: file.name, sizeBytes: file.size };
}
