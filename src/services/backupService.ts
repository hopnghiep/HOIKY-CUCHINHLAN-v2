import type { BackupPackage, MemoirDatabase } from '../types/memoir';
import { SCHEMA_VERSION } from '../data/initialData';

export function computeMemoirStats(db: MemoirDatabase) {
  const membersCount = db.members.filter((m) => m.group === 'member').length;
  const guestsCount = db.members.filter((m) => m.group === 'guest_advisor').length;
  const eventsCount = db.events.length;
  const articlesCount =
    db.leaderMessages.length +
    db.members.reduce((sum, m) => sum + (m.articles?.length || 0), 0);

  let imagesCount = 0;
  if (db.home.hero.galleryPhotos && db.home.hero.galleryPhotos.length > 0) {
    imagesCount += db.home.hero.galleryPhotos.length;
  } else if (db.home.hero.heroImage) {
    imagesCount += 1;
  }
  if (db.home.anthem.coverImage) imagesCount += 1;
  for (const msg of db.leaderMessages) {
    if (msg.thumbnailImage) imagesCount += 1;
  }
  for (const m of db.members) {
    if (m.youthPhoto) imagesCount += 1;
    if (m.presentPhoto) imagesCount += 1;
    imagesCount += m.activityPhotos?.length || 0;
  }
  for (const e of db.events) {
    if (e.coverImage) imagesCount += 1;
    imagesCount += e.photos?.length || 0;
  }

  return {
    membersCount,
    guestsCount,
    eventsCount,
    articlesCount,
    imagesCount,
  };
}

async function inlineLocalUploadUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:')) return url;
  if (!url.startsWith('/uploads/')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || url));
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export async function buildExportPackage(db: MemoirDatabase): Promise<BackupPackage> {
  const cloned = structuredClone(db);

  cloned.home.hero.heroImage = await inlineLocalUploadUrl(cloned.home.hero.heroImage);
  if (Array.isArray(cloned.home.hero.galleryPhotos)) {
    for (const gp of cloned.home.hero.galleryPhotos) {
      gp.url = await inlineLocalUploadUrl(gp.url);
    }
  }
  cloned.home.anthem.coverImage = await inlineLocalUploadUrl(cloned.home.anthem.coverImage);

  for (const msg of cloned.leaderMessages) {
    if (msg.thumbnailImage) {
      msg.thumbnailImage = await inlineLocalUploadUrl(msg.thumbnailImage);
    }
  }

  for (const member of cloned.members) {
    member.youthPhoto = await inlineLocalUploadUrl(member.youthPhoto);
    member.presentPhoto = await inlineLocalUploadUrl(member.presentPhoto);
    for (const p of member.activityPhotos) {
      p.url = await inlineLocalUploadUrl(p.url);
    }
  }

  for (const evt of cloned.events) {
    evt.coverImage = await inlineLocalUploadUrl(evt.coverImage);
    for (const p of evt.photos) {
      p.url = await inlineLocalUploadUrl(p.url);
    }
  }

  return {
    ...cloned,
    appName: 'Hồi ký Chi đoàn Cù Chính Lan',
    exportedAt: new Date().toISOString(),
    stats: computeMemoirStats(cloned),
  };
}

export function generateExportFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `Hoi_ky_chi_doan_Cu_Chinh_Lan_${datePart}_${timePart}.json`;
}

export function downloadBackupJson(pkg: BackupPackage): string {
  const filename = generateExportFilename();
  const json = JSON.stringify(pkg, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview?: {
    appName: string;
    schemaVersion: string;
    exportedAt: string;
    membersCount: number;
    guestsCount: number;
    eventsCount: number;
    milestonesCount: number;
    leaderMessagesCount: number;
    imagesCount: number;
  };
  parsedDatabase?: MemoirDatabase;
}

export function validateImportJson(rawText: string): ImportValidationResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {
      valid: false,
      errors: ['Tệp không đúng định dạng JSON hợp lệ. Dữ liệu hiện tại được giữ nguyên.'],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!parsed || typeof parsed !== 'object') {
    errors.push('Cấu trúc gốc của tệp sao lưu không hợp lệ.');
  }

  if (typeof parsed.schemaVersion !== 'string') {
    errors.push('Thiếu trường phiên bản cấu trúc dữ liệu (schemaVersion).');
  } else if (parsed.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(
      `Phiên bản tệp (${parsed.schemaVersion}) khác phiên bản hiện tại (${SCHEMA_VERSION}). Hệ thống sẽ tương thích tự động.`
    );
  }

  if (!parsed.home || typeof parsed.home !== 'object') {
    errors.push('Thiếu phân hệ nội dung Trang chủ & Lịch sử (home).');
  }
  if (!Array.isArray(parsed.members)) {
    errors.push('Thiếu danh sách hồ sơ thành viên (members).');
  }
  if (!Array.isArray(parsed.events)) {
    errors.push('Thiếu danh sách sự kiện (events).');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  const normalized: MemoirDatabase = {
    schemaVersion: SCHEMA_VERSION,
    lastModified: new Date().toISOString(),
    home: parsed.home as MemoirDatabase['home'],
    milestones: Array.isArray(parsed.milestones)
      ? (parsed.milestones as MemoirDatabase['milestones'])
      : [],
    leaderMessages: Array.isArray(parsed.leaderMessages)
      ? (parsed.leaderMessages as MemoirDatabase['leaderMessages'])
      : [],
    cohorts: Array.isArray(parsed.cohorts)
      ? (parsed.cohorts as MemoirDatabase['cohorts'])
      : [],
    members: parsed.members as MemoirDatabase['members'],
    events: parsed.events as MemoirDatabase['events'],
    settings: (parsed.settings as MemoirDatabase['settings']) || {
      themeMode: 'dark',
      showSampleBanner: true,
      autoSaveEnabled: true,
      compactCards: false,
    },
  };

  const stats = computeMemoirStats(normalized);

  return {
    valid: true,
    errors: [],
    warnings,
    preview: {
      appName: typeof parsed.appName === 'string' ? parsed.appName : 'Gói dữ liệu Hồi ký Chi đoàn',
      schemaVersion: String(parsed.schemaVersion),
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : normalized.lastModified,
      membersCount: stats.membersCount,
      guestsCount: stats.guestsCount,
      eventsCount: stats.eventsCount,
      milestonesCount: normalized.milestones.length,
      leaderMessagesCount: normalized.leaderMessages.length,
      imagesCount: stats.imagesCount,
    },
    parsedDatabase: normalized,
  };
}
