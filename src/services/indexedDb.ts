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

export async function compressImageFile(
  file: File,
  options?: { maxDimension?: number; quality?: number }
): Promise<{ dataUrl: string; mimeType: string; fileName: string; originalBytes: number; compressedBytes: number }> {
  const maxDimension = options?.maxDimension ?? 1600;
  const quality = options?.quality ?? 0.82;
  const originalDataUrl = await readFileAsDataUrl(file);

  const compressed = await new Promise<{ dataUrl: string; mimeType: string }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        if (!naturalW || !naturalH) {
          resolve({ dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
          return;
        }

        const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
        const targetW = Math.max(1, Math.round(naturalW * scale));
        const targetH = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Prefer WebP for best compression & smooth slideshow rendering; fallback to JPEG
        const webpUrl = canvas.toDataURL('image/webp', quality);
        if (webpUrl.startsWith('data:image/webp')) {
          resolve({ dataUrl: webpUrl, mimeType: 'image/webp' });
          return;
        }

        const jpegUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl: jpegUrl, mimeType: 'image/jpeg' });
      } catch {
        resolve({ dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
      }
    };
    img.onerror = () => resolve({ dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
    img.src = originalDataUrl;
  });

  // Keep whichever representation is smaller when dimensions didn't need shrinking
  const useCompressed = compressed.dataUrl.length <= originalDataUrl.length || file.size > 350 * 1024;
  const finalDataUrl = useCompressed ? compressed.dataUrl : originalDataUrl;
  const finalMime = useCompressed ? compressed.mimeType : file.type || 'image/jpeg';
  const ext = finalMime === 'image/webp' ? 'webp' : finalMime === 'image/png' ? 'png' : 'jpg';
  const baseName = (file.name || 'slide').replace(/\.[^.]+$/, '');
  const compressedBytes = Math.round(((finalDataUrl.split(',')[1] || '').length * 3) / 4);

  return {
    dataUrl: finalDataUrl,
    mimeType: finalMime,
    fileName: `${baseName}.${ext}`,
    originalBytes: file.size,
    compressedBytes,
  };
}

export async function uploadCompressedImage(
  file: File,
  options?: { maxDimension?: number; quality?: number }
): Promise<{ url: string; mimeType: string; originalBytes: number; compressedBytes: number }> {
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const mime = file.type.toLowerCase();
  if (!validImageTypes.includes(mime)) {
    throw new Error('Chỉ hỗ trợ định dạng ảnh JPG, JPEG, PNG hoặc WEBP.');
  }

  const compressed = await compressImageFile(file, options);

  try {
    const res = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
      body: JSON.stringify({ dataUrl: compressed.dataUrl, fileName: compressed.fileName }),
    });
    if (res.ok) {
      const json = (await res.json()) as { url: string; mimeType: string };
      return {
        url: json.url,
        mimeType: json.mimeType || compressed.mimeType,
        originalBytes: compressed.originalBytes,
        compressedBytes: compressed.compressedBytes,
      };
    }

    const memberRes = await fetch('/api/media/member-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: compressed.dataUrl, fileName: compressed.fileName }),
    });
    if (memberRes.ok) {
      const json = (await memberRes.json()) as { url: string; mimeType: string };
      return {
        url: json.url,
        mimeType: json.mimeType || compressed.mimeType,
        originalBytes: compressed.originalBytes,
        compressedBytes: compressed.compressedBytes,
      };
    }
  } catch {
    // Fallback to compressed inline data URL when offline
  }

  return {
    url: compressed.dataUrl,
    mimeType: compressed.mimeType,
    originalBytes: compressed.originalBytes,
    compressedBytes: compressed.compressedBytes,
  };
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
