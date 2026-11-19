import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { BOOTSTRAP_ADMIN_EMAIL, db } from '../firebase';
import { INITIAL_MEMOIR_DATA, SCHEMA_VERSION } from '../data/initialData';
import type {
  AppSettings,
  CohortItem,
  DataOrigin,
  EventCategory,
  HomeMemoirData,
  LeaderMessage,
  MemberProfile,
  MemoirDatabase,
  SchoolEvent,
  TimelineMilestone,
} from '../types/memoir';
import { handleFirestoreError, OperationType } from './firestoreError';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const ALLOWED_EVENT_CATEGORIES: EventCategory[] = [
  'Phong trào',
  'Tình nguyện',
  'Đại hội',
  'Kỷ niệm',
  'Văn nghệ',
  'Hoạt động truyền thống',
  'Hoạt động khác',
];

export interface AdminRecordItem {
  uid: string;
  email: string;
  displayName: string;
  grantedBy: string;
  createdAt: string;
}

export interface FirestoreSyncTracker {
  hasConfig: boolean;
  milestoneIds: Set<string>;
  messageIds: Set<string>;
  cohortIds: Set<string>;
  memberIds: Set<string>;
  memberContactIds: Set<string>;
  eventIds: Set<string>;
}

export function createEmptySyncTracker(): FirestoreSyncTracker {
  return {
    hasConfig: false,
    milestoneIds: new Set(),
    messageIds: new Set(),
    cohortIds: new Set(),
    memberIds: new Set(),
    memberContactIds: new Set(),
    eventIds: new Set(),
  };
}

// ============================================================================
// Defensive Payload Sanitization (Synchronized with firebase-blueprint.json)
// ============================================================================

export function sanitizeId(raw: string | undefined, prefix: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function sanitizeOptionalId(raw: string | undefined): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return cleaned && VALID_ID_REGEX.test(cleaned) ? cleaned : '';
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val : '';
  const clipped = str.length > maxLen ? str.slice(0, maxLen) : str;
  if (!clipped.trim() && fallback) {
    return fallback.slice(0, maxLen);
  }
  return clipped;
}

function normalizeOrigin(val: unknown): DataOrigin {
  return val === 'sample' ? 'sample' : 'real';
}

function clampOrder(val: unknown, fallback = 0): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? Math.floor(val) : fallback;
  return Math.max(0, Math.min(100000, n));
}

function toIsoString(val: unknown, fallback = ''): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return fallback;
}

/**
 * Ensures any inline base64 data URL image is persisted to /uploads so Firestore
 * documents stay well below the 2048-char URL cap and 1MB document limit.
 */
async function ensureRemoteMediaUrl(url: string | undefined, hintName = 'media'): Promise<string> {
  const raw = (url || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('data:image/')) {
    return raw.slice(0, 2048);
  }
  if (raw.length <= 2048) {
    return raw;
  }
  try {
    const res = await fetch('/api/media/member-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl: raw, fileName: `${hintName}.png` }),
    });
    if (res.ok) {
      const json = (await res.json()) as { url?: string };
      if (json.url) {
        return json.url.slice(0, 2048);
      }
    }
  } catch {
    // Ignore upload failure; fall through to empty safe URL
  }
  return '';
}

async function sanitizeHomeData(home: HomeMemoirData): Promise<Record<string, unknown>> {
  const heroImage = await ensureRemoteMediaUrl(home.hero.heroImage, 'hero');
  const anthemCover = await ensureRemoteMediaUrl(home.anthem.coverImage, 'anthem');

  const sanitizedHome: Record<string, unknown> = {
    hero: {
      spaceLabel: clampStr(home.hero.spaceLabel, 200),
      title: clampStr(home.hero.title, 240, 'Hồi ký Chi đoàn Cù Chính Lan'),
      unitIntro: clampStr(home.hero.unitIntro, 400),
      subtitle: clampStr(home.hero.subtitle, 2000),
      heroImage: clampStr(heroImage, 2048),
    },
    history: {
      ...(home.history.sectionLabel !== undefined ? { sectionLabel: clampStr(home.history.sectionLabel, 200) } : {}),
      ...(home.history.sectionTitle !== undefined ? { sectionTitle: clampStr(home.history.sectionTitle, 240) } : {}),
      foundingTitle: clampStr(home.history.foundingTitle, 240),
      foundingContent: clampStr(home.history.foundingContent, 12000),
      stages: (Array.isArray(home.history.stages) ? home.history.stages : []).slice(0, 50).map((s, idx) => ({
        id: sanitizeId(s.id, `stage_${idx}`),
        period: clampStr(s.period, 120),
        title: clampStr(s.title, 240),
        description: clampStr(s.description, 4000),
      })),
      ...(home.history.achievementsTitle !== undefined
        ? { achievementsTitle: clampStr(home.history.achievementsTitle, 240) }
        : {}),
      achievementsSummary: clampStr(home.history.achievementsSummary, 8000),
    },
    meaning: {
      ...(home.meaning.sectionLabel !== undefined ? { sectionLabel: clampStr(home.meaning.sectionLabel, 200) } : {}),
      ...(home.meaning.sectionTitle !== undefined ? { sectionTitle: clampStr(home.meaning.sectionTitle, 240) } : {}),
      introContent: clampStr(home.meaning.introContent, 8000),
      ...(home.meaning.traditionalValuesTitle !== undefined
        ? { traditionalValuesTitle: clampStr(home.meaning.traditionalValuesTitle, 240) }
        : {}),
      traditionalValues: clampStr(home.meaning.traditionalValues, 4000),
      ...(home.meaning.memoirGoalsTitle !== undefined
        ? { memoirGoalsTitle: clampStr(home.meaning.memoirGoalsTitle, 240) }
        : {}),
      memoirGoals: clampStr(home.meaning.memoirGoals, 4000),
      ...(home.meaning.generationalConnectionTitle !== undefined
        ? { generationalConnectionTitle: clampStr(home.meaning.generationalConnectionTitle, 240) }
        : {}),
      generationalConnection: clampStr(home.meaning.generationalConnection, 4000),
    },
    anthem: {
      ...(home.anthem.sectionLabel !== undefined ? { sectionLabel: clampStr(home.anthem.sectionLabel, 200) } : {}),
      title: clampStr(home.anthem.title, 240),
      ...(home.anthem.authorName !== undefined ? { authorName: clampStr(home.anthem.authorName, 200) } : {}),
      composerInfo: clampStr(home.anthem.composerInfo, 600),
      ...(home.anthem.relatedInfo !== undefined ? { relatedInfo: clampStr(home.anthem.relatedInfo, 2000) } : {}),
      coverImage: clampStr(anthemCover, 2048),
      ...(home.anthem.lyricsLabel !== undefined ? { lyricsLabel: clampStr(home.anthem.lyricsLabel, 200) } : {}),
      ...(home.anthem.lyrics !== undefined ? { lyrics: clampStr(home.anthem.lyrics, 12000) } : {}),
      sections: (Array.isArray(home.anthem.sections) ? home.anthem.sections : []).slice(0, 40).map((sec, idx) => ({
        id: sanitizeId(sec.id, `asec_${idx}`),
        partType: sec.partType || 'Verse',
        label: clampStr(sec.label, 160),
        lyrics: clampStr(sec.lyrics, 4000),
      })),
      ...(home.anthem.youtubeSectionTitle !== undefined
        ? { youtubeSectionTitle: clampStr(home.anthem.youtubeSectionTitle, 240) }
        : {}),
      ...(home.anthem.youtubeSectionSubtitle !== undefined
        ? { youtubeSectionSubtitle: clampStr(home.anthem.youtubeSectionSubtitle, 600) }
        : {}),
      ...(Array.isArray(home.anthem.youtubeTracks)
        ? {
            youtubeTracks: home.anthem.youtubeTracks.slice(0, 30).map((t, idx) => ({
              id: sanitizeId(t.id, `yt_${idx}`),
              title: clampStr(t.title, 240),
              author: clampStr(t.author, 200),
              youtubeUrl: clampStr(t.youtubeUrl, 2048),
              notes: clampStr(t.notes, 1000),
            })),
          }
        : {}),
    },
    socialChannels: (Array.isArray(home.socialChannels) ? home.socialChannels : []).slice(0, 30).map((ch, idx) => ({
      id: sanitizeId(ch.id, `soc_${idx}`),
      platform: clampStr(ch.platform, 100),
      label: clampStr(ch.label, 200),
      url: clampStr(ch.url, 2048),
    })),
    dataOrigin: normalizeOrigin(home.dataOrigin),
  };

  if (home.milestonesLabel !== undefined) sanitizedHome.milestonesLabel = clampStr(home.milestonesLabel, 200);
  if (home.milestonesTitle !== undefined) sanitizedHome.milestonesTitle = clampStr(home.milestonesTitle, 240);
  if (home.messagesLabel !== undefined) sanitizedHome.messagesLabel = clampStr(home.messagesLabel, 200);
  if (home.messagesTitle !== undefined) sanitizedHome.messagesTitle = clampStr(home.messagesTitle, 240);

  return sanitizedHome;
}

function sanitizeSettings(settings: AppSettings): AppSettings {
  return {
    themeMode: settings.themeMode === 'neutral' ? 'neutral' : 'dark',
    showSampleBanner: Boolean(settings.showSampleBanner),
    autoSaveEnabled: Boolean(settings.autoSaveEnabled),
    compactCards: Boolean(settings.compactCards),
  };
}

function buildMilestoneMutableFields(m: TimelineMilestone, index: number) {
  return {
    year: clampStr(m.year, 40, 'N/A'),
    title: clampStr(m.title, 240, 'Mốc son lịch sử'),
    description: clampStr(m.description, 4000),
    orderIndex: clampOrder(m.orderIndex, index),
    dataOrigin: normalizeOrigin(m.dataOrigin),
    visibility: 'public' as const,
    updatedAt: serverTimestamp(),
  };
}

function buildMessageMutableFields(msg: LeaderMessage) {
  return {
    title: clampStr(msg.title, 240, 'Lời ngỏ'),
    authorName: clampStr(msg.authorName, 160, 'Ban Chấp hành Chi đoàn'),
    authorRole: clampStr(msg.authorRole, 200),
    period: clampStr(msg.period, 120),
    content: clampStr(msg.content, 12000, 'Đang cập nhật nội dung.'),
    displayDate: clampStr(msg.createdAt, 40),
    dataOrigin: normalizeOrigin(msg.dataOrigin),
    visibility: 'public' as const,
    updatedAt: serverTimestamp(),
  };
}

function buildCohortMutableFields(c: CohortItem, index: number) {
  return {
    name: clampStr(c.name, 160, 'Niên khóa'),
    period: clampStr(c.period, 120),
    description: clampStr(c.description, 4000),
    linkedEventIds: (Array.isArray(c.linkedEventIds) ? c.linkedEventIds : [])
      .map((id) => sanitizeOptionalId(id))
      .filter(Boolean)
      .slice(0, 100),
    linkedMilestoneIds: (Array.isArray(c.linkedMilestoneIds) ? c.linkedMilestoneIds : [])
      .map((id) => sanitizeOptionalId(id))
      .filter(Boolean)
      .slice(0, 100),
    linkedMessageIds: (Array.isArray(c.linkedMessageIds) ? c.linkedMessageIds : [])
      .map((id) => sanitizeOptionalId(id))
      .filter(Boolean)
      .slice(0, 100),
    orderIndex: clampOrder(c.orderIndex, index),
    dataOrigin: normalizeOrigin(c.dataOrigin),
    visibility: 'public' as const,
    updatedAt: serverTimestamp(),
  };
}

async function buildMemberPublicFields(m: MemberProfile, index: number) {
  const youthPhoto = await ensureRemoteMediaUrl(m.youthPhoto, `youth_${m.id}`);
  const presentPhoto = await ensureRemoteMediaUrl(m.presentPhoto, `present_${m.id}`);

  const activityPhotos = await Promise.all(
    (Array.isArray(m.activityPhotos) ? m.activityPhotos : []).slice(0, 60).map(async (p, pIdx) => ({
      id: sanitizeId(p.id, `ap_${pIdx}`),
      url: clampStr(await ensureRemoteMediaUrl(p.url, `ap_${m.id}_${pIdx}`), 2048),
      caption: clampStr(p.caption, 400),
      takenAt: clampStr(p.takenAt, 40),
    }))
  );

  const articles = (Array.isArray(m.articles) ? m.articles : []).slice(0, 50).map((a, aIdx) => ({
    id: sanitizeId(a.id, `art_${aIdx}`),
    title: clampStr(a.title, 240),
    content: clampStr(a.content, 8000),
    publishedAt: clampStr(a.publishedAt, 40),
  }));

  const publicSocials: Record<string, string> = {};
  if (m.socials?.facebook) publicSocials.facebook = clampStr(m.socials.facebook, 2048);
  if (m.socials?.website) publicSocials.website = clampStr(m.socials.website, 2048);

  return {
    group: m.group === 'guest_advisor' ? 'guest_advisor' : 'member',
    cohortId: sanitizeOptionalId(m.cohortId),
    fullName: clampStr(m.fullName, 160, 'Đoàn viên Chi đoàn'),
    youthPhoto: clampStr(youthPhoto, 2048),
    presentPhoto: clampStr(presentPhoto, 2048),
    cohortLabel: clampStr(m.cohortLabel, 120),
    presentLabel: clampStr(m.presentLabel, 120),
    role: clampStr(m.role, 200),
    occupation: clampStr(m.occupation, 200),
    field: clampStr(m.field, 200),
    joinDate: clampStr(m.joinDate, 40),
    biography: clampStr(m.biography, 6000),
    selfIntro: clampStr(m.selfIntro, 4000),
    achievements: (Array.isArray(m.achievements) ? m.achievements : [])
      .map((a) => clampStr(a, 500))
      .filter(Boolean)
      .slice(0, 50),
    activityPhotos,
    articles,
    socials: publicSocials,
    favoriteQuote: clampStr(m.favoriteQuote, 600),
    orderIndex: clampOrder(m.orderIndex, index),
    dataOrigin: normalizeOrigin(m.dataOrigin),
    visibility: 'public' as const,
    ownerUid: sanitizeOptionalId(m.ownerUid),
    updatedAt: serverTimestamp(),
  };
}

function buildMemberPrivateContactPayload(memberId: string, m: MemberProfile) {
  return {
    memberId,
    ownerUid: sanitizeOptionalId(m.ownerUid),
    phone: clampStr(m.phone, 40),
    email: clampStr(m.email, 254),
    zalo: clampStr(m.socials?.zalo, 80),
    viber: clampStr(m.socials?.viber, 80),
    updatedAt: serverTimestamp(),
  };
}

async function buildEventMutableFields(evt: SchoolEvent) {
  const coverImage = await ensureRemoteMediaUrl(evt.coverImage, `evt_cover_${evt.id}`);
  const photos = await Promise.all(
    (Array.isArray(evt.photos) ? evt.photos : []).slice(0, 60).map(async (p, idx) => ({
      id: sanitizeId(p.id, `ep_${idx}`),
      url: clampStr(await ensureRemoteMediaUrl(p.url, `ep_${evt.id}_${idx}`), 2048),
      caption: clampStr(p.caption, 400),
      albumName: clampStr(p.albumName, 160),
    }))
  );
  const videos = (Array.isArray(evt.videos) ? evt.videos : []).slice(0, 20).map((v, idx) => ({
    id: sanitizeId(v.id, `ev_${idx}`),
    url: clampStr(v.url, 2048),
    title: clampStr(v.title, 240),
    mimeType: clampStr(v.mimeType, 80),
  }));

  const category: EventCategory = ALLOWED_EVENT_CATEGORIES.includes(evt.category)
    ? evt.category
    : 'Hoạt động khác';

  return {
    title: clampStr(evt.title, 240, 'Sự kiện Chi đoàn'),
    category,
    date: clampStr(evt.date, 40),
    startTime: clampStr(evt.startTime, 20),
    endTime: clampStr(evt.endTime, 20),
    location: clampStr(evt.location, 300),
    intro: clampStr(evt.intro, 6000),
    proceedings: clampStr(evt.proceedings, 12000),
    results: clampStr(evt.results, 6000),
    summary: clampStr(evt.summary, 2000),
    coverImage: clampStr(coverImage, 2048),
    photos,
    videos,
    participantMemberIds: (Array.isArray(evt.participantMemberIds) ? evt.participantMemberIds : [])
      .map((id) => sanitizeOptionalId(id))
      .filter(Boolean)
      .slice(0, 200),
    dataOrigin: normalizeOrigin(evt.dataOrigin),
    visibility: 'public' as const,
    updatedAt: serverTimestamp(),
  };
}

// ============================================================================
// Authentication & Admin Role Helpers
// ============================================================================

export async function checkIsUserAdmin(user: User): Promise<boolean> {
  if (!user.emailVerified) {
    return false;
  }
  if (user.email && user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const path = `admins/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncUserAccountDoc(user: User, isAdminUser: boolean): Promise<void> {
  if (!user.emailVerified || !user.email) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const existing = await getDoc(ref);
    const displayName = clampStr(user.displayName || user.email.split('@')[0], 120, 'Thành viên');
    const photoURL = clampStr(user.photoURL || '', 2048);
    const email = clampStr(user.email, 254);

    if (!existing.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        photoURL,
        role: isAdminUser ? 'admin' : 'member',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        photoURL,
        email,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listAdminRecords(): Promise<AdminRecordItem[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid || d.id),
        email: String(data.email || ''),
        displayName: String(data.displayName || ''),
        grantedBy: String(data.grantedBy || ''),
        createdAt: toIsoString(data.createdAt),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function grantAdminRole(
  targetUid: string,
  email: string,
  displayName: string,
  grantedByUid: string
): Promise<void> {
  const cleanUid = sanitizeOptionalId(targetUid);
  if (!cleanUid) {
    throw new Error('UID người dùng không hợp lệ (chỉ gồm chữ cái, số, dấu gạch dưới hoặc gạch ngang).');
  }
  const path = `admins/${cleanUid}`;
  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: clampStr(email.trim(), 254, 'admin@example.com'),
      displayName: clampStr(displayName.trim(), 120, 'Quản trị viên'),
      grantedBy: grantedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function revokeAdminRole(targetUid: string): Promise<void> {
  const cleanUid = sanitizeOptionalId(targetUid);
  if (!cleanUid) return;
  const path = `admins/${cleanUid}`;
  try {
    await deleteDoc(doc(db, 'admins', cleanUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// Real-time Firestore Subscription (Auth-Gated)
// ============================================================================

interface SubscriptionCallbacks {
  onSnapshotData: (nextDb: MemoirDatabase, hasConfigInCloud: boolean) => void;
  onError: (error: unknown) => void;
}

export function subscribeMemoirFirestore(
  user: User,
  isAdminUser: boolean,
  tracker: FirestoreSyncTracker,
  callbacks: SubscriptionCallbacks
): Unsubscribe {
  let configDocData: {
    schemaVersion: string;
    home: HomeMemoirData;
    settings: AppSettings;
    lastModified: string;
  } | null = null;
  let configLoaded = false;

  let milestones: TimelineMilestone[] = [];
  let leaderMessages: LeaderMessage[] = [];
  let cohorts: CohortItem[] = [];
  let publicMembers: MemberProfile[] = [];
  let events: SchoolEvent[] = [];

  const privateContacts = new Map<
    string,
    { phone: string; email: string; zalo?: string; viber?: string }
  >();

  let loadedFlags = {
    config: false,
    milestones: false,
    messages: false,
    cohorts: false,
    members: false,
    events: false,
  };

  let cancelled = false;

  const emitCombined = () => {
    if (cancelled) return;
    if (
      !loadedFlags.config ||
      !loadedFlags.milestones ||
      !loadedFlags.messages ||
      !loadedFlags.cohorts ||
      !loadedFlags.members ||
      !loadedFlags.events
    ) {
      return;
    }

    if (!configDocData) {
      callbacks.onSnapshotData(INITIAL_MEMOIR_DATA, false);
      return;
    }

    const mergedMembers = publicMembers.map((m) => {
      const contact = privateContacts.get(m.id);
      if (!contact) return m;
      return {
        ...m,
        phone: contact.phone,
        email: contact.email,
        socials: {
          ...m.socials,
          ...(contact.zalo ? { zalo: contact.zalo } : {}),
          ...(contact.viber ? { viber: contact.viber } : {}),
        },
      };
    });

    const combined: MemoirDatabase = {
      schemaVersion: configDocData.schemaVersion || SCHEMA_VERSION,
      lastModified: configDocData.lastModified || new Date().toISOString(),
      home: configDocData.home,
      settings: configDocData.settings,
      milestones: [...milestones].sort((a, b) => a.orderIndex - b.orderIndex),
      leaderMessages: [...leaderMessages],
      cohorts: [...cohorts].sort((a, b) => a.orderIndex - b.orderIndex),
      members: mergedMembers.sort((a, b) => a.orderIndex - b.orderIndex),
      events: [...events].sort((a, b) => b.date.localeCompare(a.date)),
    };

    callbacks.onSnapshotData(combined, configLoaded);
  };

  const refreshAllowedContacts = async (membersList: MemberProfile[]) => {
    const eligible = membersList.filter((m) => isAdminUser || (m.ownerUid && m.ownerUid === user.uid));
    await Promise.all(
      eligible.map(async (m) => {
        const contactPath = `members/${m.id}/private/contact`;
        try {
          const snap = await getDoc(doc(db, 'members', m.id, 'private', 'contact'));
          if (snap.exists()) {
            tracker.memberContactIds.add(m.id);
            const c = snap.data();
            privateContacts.set(m.id, {
              phone: typeof c.phone === 'string' ? c.phone : '',
              email: typeof c.email === 'string' ? c.email : '',
              zalo: typeof c.zalo === 'string' && c.zalo ? c.zalo : undefined,
              viber: typeof c.viber === 'string' && c.viber ? c.viber : undefined,
            });
          } else {
            tracker.memberContactIds.delete(m.id);
          }
        } catch (error) {
          // Only rethrow unexpected permission issues on eligible docs
          try {
            handleFirestoreError(error, OperationType.GET, contactPath);
          } catch (wrapped) {
            callbacks.onError(wrapped);
          }
        }
      })
    );
    emitCombined();
  };

  const unsubs: Unsubscribe[] = [];

  // 1. memoirConfig/main
  unsubs.push(
    onSnapshot(
      doc(db, 'memoirConfig', 'main'),
      (snap) => {
        loadedFlags.config = true;
        if (snap.exists()) {
          tracker.hasConfig = true;
          configLoaded = true;
          const d = snap.data();
          configDocData = {
            schemaVersion: String(d.schemaVersion || SCHEMA_VERSION),
            home: d.home as HomeMemoirData,
            settings: d.settings as AppSettings,
            lastModified: toIsoString(d.updatedAt, new Date().toISOString()),
          };
        } else {
          tracker.hasConfig = false;
          configLoaded = false;
          configDocData = null;
        }
        emitCombined();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'memoirConfig/main');
        } catch (wrapped) {
          callbacks.onError(wrapped);
        }
      }
    )
  );

  // 2. milestones
  unsubs.push(
    onSnapshot(
      query(collection(db, 'milestones'), where('visibility', '==', 'public')),
      (snap) => {
        loadedFlags.milestones = true;
        tracker.milestoneIds = new Set(snap.docs.map((d) => d.id));
        milestones = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            year: String(data.year || ''),
            title: String(data.title || ''),
            description: String(data.description || ''),
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
            dataOrigin: normalizeOrigin(data.dataOrigin),
          };
        });
        emitCombined();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'milestones');
        } catch (wrapped) {
          callbacks.onError(wrapped);
        }
      }
    )
  );

  // 3. leaderMessages
  unsubs.push(
    onSnapshot(
      query(collection(db, 'leaderMessages'), where('visibility', '==', 'public')),
      (snap) => {
        loadedFlags.messages = true;
        tracker.messageIds = new Set(snap.docs.map((d) => d.id));
        leaderMessages = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || ''),
            authorName: String(data.authorName || ''),
            authorRole: String(data.authorRole || ''),
            period: String(data.period || ''),
            content: String(data.content || ''),
            createdAt: String(data.displayDate || toIsoString(data.createdAt).slice(0, 10)),
            dataOrigin: normalizeOrigin(data.dataOrigin),
          };
        });
        emitCombined();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'leaderMessages');
        } catch (wrapped) {
          callbacks.onError(wrapped);
        }
      }
    )
  );

  // 4. cohorts
  unsubs.push(
    onSnapshot(
      query(collection(db, 'cohorts'), where('visibility', '==', 'public')),
      (snap) => {
        loadedFlags.cohorts = true;
        tracker.cohortIds = new Set(snap.docs.map((d) => d.id));
        cohorts = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name || ''),
            period: String(data.period || ''),
            description: String(data.description || ''),
            linkedEventIds: Array.isArray(data.linkedEventIds) ? data.linkedEventIds : [],
            linkedMilestoneIds: Array.isArray(data.linkedMilestoneIds) ? data.linkedMilestoneIds : [],
            linkedMessageIds: Array.isArray(data.linkedMessageIds) ? data.linkedMessageIds : [],
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
            dataOrigin: normalizeOrigin(data.dataOrigin),
          };
        });
        emitCombined();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'cohorts');
        } catch (wrapped) {
          callbacks.onError(wrapped);
        }
      }
    )
  );

  // 5. members (public profiles) + authorized private/contact fetch
  unsubs.push(
    onSnapshot(
      query(collection(db, 'members'), where('visibility', '==', 'public')),
      (snap) => {
        loadedFlags.members = true;
        tracker.memberIds = new Set(snap.docs.map((d) => d.id));
        publicMembers = snap.docs.map((d) => {
          const data = d.data();
          const socialsMap = (data.socials || {}) as { facebook?: string; website?: string };
          return {
            id: d.id,
            group: data.group === 'guest_advisor' ? 'guest_advisor' : 'member',
            cohortId: typeof data.cohortId === 'string' && data.cohortId ? data.cohortId : undefined,
            fullName: String(data.fullName || ''),
            youthPhoto: String(data.youthPhoto || ''),
            presentPhoto: String(data.presentPhoto || ''),
            cohortLabel: String(data.cohortLabel || ''),
            presentLabel: String(data.presentLabel || ''),
            role: String(data.role || ''),
            occupation: String(data.occupation || ''),
            field: String(data.field || ''),
            joinDate: String(data.joinDate || ''),
            phone: '',
            email: '',
            biography: String(data.biography || ''),
            selfIntro: String(data.selfIntro || ''),
            achievements: Array.isArray(data.achievements) ? data.achievements : [],
            activityPhotos: Array.isArray(data.activityPhotos) ? data.activityPhotos : [],
            articles: Array.isArray(data.articles) ? data.articles : [],
            socials: {
              ...(socialsMap.facebook ? { facebook: socialsMap.facebook } : {}),
              ...(socialsMap.website ? { website: socialsMap.website } : {}),
            },
            favoriteQuote: String(data.favoriteQuote || ''),
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
            dataOrigin: normalizeOrigin(data.dataOrigin),
            ownerUid: typeof data.ownerUid === 'string' && data.ownerUid ? data.ownerUid : undefined,
            updatedAt: toIsoString(data.updatedAt, new Date().toISOString()),
          };
        });
        emitCombined();
        void refreshAllowedContacts(publicMembers);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'members');
        } catch (wrapped) {
          callbacks.onError(wrapped);
        }
      }
    )
  );

  // 6. events
  unsubs.push(
    onSnapshot(
      query(collection(db, 'events'), where('visibility', '==', 'public')),
      (snap) => {
        loadedFlags.events = true;
        tracker.eventIds = new Set(snap.docs.map((d) => d.id));
        events = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || ''),
            category: ALLOWED_EVENT_CATEGORIES.includes(data.category as EventCategory)
              ? (data.category as EventCategory)
              : 'Hoạt động khác',
            date: String(data.date || ''),
            startTime: String(data.startTime || ''),
            endTime: String(data.endTime || ''),
            location: String(data.location || ''),
            intro: String(data.intro || ''),
            proceedings: String(data.proceedings || ''),
            results: String(data.results || ''),
            summary: String(data.summary || ''),
            coverImage: String(data.coverImage || ''),
            photos: Array.isArray(data.photos) ? data.photos : [],
            videos: Array.isArray(data.videos) ? data.videos : [],
            participantMemberIds: Array.isArray(data.participantMemberIds) ? data.participantMemberIds : [],
            dataOrigin: normalizeOrigin(data.dataOrigin),
            updatedAt: toIsoString(data.updatedAt, new Date().toISOString()),
          };
        });
        emitCombined();
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'events');
        } catch (wrapped) {
          callbacks.onError(wrapped);
        }
      }
    )
  );

  return () => {
    cancelled = true;
    for (const u of unsubs) {
      u();
    }
  };
}

// ============================================================================
// Batched Writes & Diff Sync to Cloud Firestore
// ============================================================================

type BatchOp = (batch: ReturnType<typeof writeBatch>) => void;

async function commitBatchedOps(ops: BatchOp[], pathHint: string): Promise<void> {
  if (ops.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const op of chunk) {
      op(batch);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathHint);
    }
  }
}

export async function syncFullMemoirToFirestore(
  prevDb: MemoirDatabase | null,
  nextDb: MemoirDatabase,
  uid: string,
  tracker: FirestoreSyncTracker,
  forceFullWrite = false
): Promise<void> {
  const ops: BatchOp[] = [];

  // 1. memoirConfig/main
  const configChanged =
    forceFullWrite ||
    !tracker.hasConfig ||
    !prevDb ||
    JSON.stringify(prevDb.home) !== JSON.stringify(nextDb.home) ||
    JSON.stringify(prevDb.settings) !== JSON.stringify(nextDb.settings) ||
    prevDb.schemaVersion !== nextDb.schemaVersion;

  if (configChanged) {
    const sanitizedHome = await sanitizeHomeData(nextDb.home);
    const sanitizedSettings = sanitizeSettings(nextDb.settings);
    const configPayload = {
      schemaVersion: clampStr(nextDb.schemaVersion || SCHEMA_VERSION, 32, SCHEMA_VERSION),
      home: sanitizedHome,
      settings: sanitizedSettings,
      visibility: 'public' as const,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    };
    const ref = doc(db, 'memoirConfig', 'main');
    if (tracker.hasConfig) {
      ops.push((b) => b.update(ref, configPayload));
    } else {
      ops.push((b) => b.set(ref, configPayload));
      tracker.hasConfig = true;
    }
  }

  // 2. milestones
  const prevMilestonesMap = new Map((prevDb?.milestones || []).map((m) => [m.id, m]));
  const nextMilestoneIds = new Set<string>();
  for (let idx = 0; idx < nextDb.milestones.length; idx++) {
    const m = nextDb.milestones[idx];
    const docId = sanitizeId(m.id, `ms_${idx}`);
    nextMilestoneIds.add(docId);
    const prev = prevMilestonesMap.get(m.id);
    if (forceFullWrite || !tracker.milestoneIds.has(docId) || !prev || JSON.stringify(prev) !== JSON.stringify(m)) {
      const ref = doc(db, 'milestones', docId);
      const mutable = buildMilestoneMutableFields(m, idx);
      if (tracker.milestoneIds.has(docId)) {
        ops.push((b) => b.update(ref, mutable));
      } else {
        ops.push((b) =>
          b.set(ref, {
            id: docId,
            ...mutable,
            createdBy: uid,
            createdAt: serverTimestamp(),
          })
        );
        tracker.milestoneIds.add(docId);
      }
    }
  }
  for (const existingId of Array.from(tracker.milestoneIds)) {
    if (!nextMilestoneIds.has(existingId)) {
      ops.push((b) => b.delete(doc(db, 'milestones', existingId)));
      tracker.milestoneIds.delete(existingId);
    }
  }

  // 3. leaderMessages
  const prevMessagesMap = new Map((prevDb?.leaderMessages || []).map((m) => [m.id, m]));
  const nextMessageIds = new Set<string>();
  for (let idx = 0; idx < nextDb.leaderMessages.length; idx++) {
    const msg = nextDb.leaderMessages[idx];
    const docId = sanitizeId(msg.id, `msg_${idx}`);
    nextMessageIds.add(docId);
    const prev = prevMessagesMap.get(msg.id);
    if (forceFullWrite || !tracker.messageIds.has(docId) || !prev || JSON.stringify(prev) !== JSON.stringify(msg)) {
      const ref = doc(db, 'leaderMessages', docId);
      const mutable = buildMessageMutableFields(msg);
      if (tracker.messageIds.has(docId)) {
        ops.push((b) => b.update(ref, mutable));
      } else {
        ops.push((b) =>
          b.set(ref, {
            id: docId,
            ...mutable,
            createdBy: uid,
            createdAt: serverTimestamp(),
          })
        );
        tracker.messageIds.add(docId);
      }
    }
  }
  for (const existingId of Array.from(tracker.messageIds)) {
    if (!nextMessageIds.has(existingId)) {
      ops.push((b) => b.delete(doc(db, 'leaderMessages', existingId)));
      tracker.messageIds.delete(existingId);
    }
  }

  // 4. cohorts
  const nextCohorts = nextDb.cohorts || [];
  const prevCohortsMap = new Map((prevDb?.cohorts || []).map((c) => [c.id, c]));
  const nextCohortIds = new Set<string>();
  for (let idx = 0; idx < nextCohorts.length; idx++) {
    const c = nextCohorts[idx];
    const docId = sanitizeId(c.id, `cohort_${idx}`);
    nextCohortIds.add(docId);
    const prev = prevCohortsMap.get(c.id);
    if (forceFullWrite || !tracker.cohortIds.has(docId) || !prev || JSON.stringify(prev) !== JSON.stringify(c)) {
      const ref = doc(db, 'cohorts', docId);
      const mutable = buildCohortMutableFields(c, idx);
      if (tracker.cohortIds.has(docId)) {
        ops.push((b) => b.update(ref, mutable));
      } else {
        ops.push((b) =>
          b.set(ref, {
            id: docId,
            ...mutable,
            createdBy: uid,
            createdAt: serverTimestamp(),
          })
        );
        tracker.cohortIds.add(docId);
      }
    }
  }
  for (const existingId of Array.from(tracker.cohortIds)) {
    if (!nextCohortIds.has(existingId)) {
      ops.push((b) => b.delete(doc(db, 'cohorts', existingId)));
      tracker.cohortIds.delete(existingId);
    }
  }

  // 5. members + private/contact (Split Collection PII Isolation)
  const prevMembersMap = new Map((prevDb?.members || []).map((m) => [m.id, m]));
  const nextMemberIds = new Set<string>();
  for (let idx = 0; idx < nextDb.members.length; idx++) {
    const m = nextDb.members[idx];
    const docId = sanitizeId(m.id, `mem_${idx}`);
    nextMemberIds.add(docId);
    const prev = prevMembersMap.get(m.id);
    if (forceFullWrite || !tracker.memberIds.has(docId) || !prev || JSON.stringify(prev) !== JSON.stringify(m)) {
      const memberRef = doc(db, 'members', docId);
      const contactRef = doc(db, 'members', docId, 'private', 'contact');
      const publicFields = await buildMemberPublicFields(m, idx);
      const contactPayload = buildMemberPrivateContactPayload(docId, m);

      if (tracker.memberIds.has(docId)) {
        ops.push((b) => b.update(memberRef, publicFields));
      } else {
        ops.push((b) =>
          b.set(memberRef, {
            id: docId,
            ...publicFields,
            createdBy: uid,
            createdAt: serverTimestamp(),
          })
        );
        tracker.memberIds.add(docId);
      }

      if (tracker.memberContactIds.has(docId)) {
        const { memberId: _ignore, ...mutableContact } = contactPayload;
        ops.push((b) => b.update(contactRef, mutableContact));
      } else {
        ops.push((b) => b.set(contactRef, contactPayload));
        tracker.memberContactIds.add(docId);
      }
    }
  }
  for (const existingId of Array.from(tracker.memberIds)) {
    if (!nextMemberIds.has(existingId)) {
      if (tracker.memberContactIds.has(existingId)) {
        ops.push((b) => b.delete(doc(db, 'members', existingId, 'private', 'contact')));
        tracker.memberContactIds.delete(existingId);
      }
      ops.push((b) => b.delete(doc(db, 'members', existingId)));
      tracker.memberIds.delete(existingId);
    }
  }

  // 6. events
  const prevEventsMap = new Map((prevDb?.events || []).map((e) => [e.id, e]));
  const nextEventIds = new Set<string>();
  for (let idx = 0; idx < nextDb.events.length; idx++) {
    const evt = nextDb.events[idx];
    const docId = sanitizeId(evt.id, `evt_${idx}`);
    nextEventIds.add(docId);
    const prev = prevEventsMap.get(evt.id);
    if (forceFullWrite || !tracker.eventIds.has(docId) || !prev || JSON.stringify(prev) !== JSON.stringify(evt)) {
      const ref = doc(db, 'events', docId);
      const mutable = await buildEventMutableFields(evt);
      if (tracker.eventIds.has(docId)) {
        ops.push((b) => b.update(ref, mutable));
      } else {
        ops.push((b) =>
          b.set(ref, {
            id: docId,
            ...mutable,
            createdBy: uid,
            createdAt: serverTimestamp(),
          })
        );
        tracker.eventIds.add(docId);
      }
    }
  }
  for (const existingId of Array.from(tracker.eventIds)) {
    if (!nextEventIds.has(existingId)) {
      ops.push((b) => b.delete(doc(db, 'events', existingId)));
      tracker.eventIds.delete(existingId);
    }
  }

  await commitBatchedOps(ops, 'memoir_batch_sync');
}

/**
 * Self-service save for a signed-in verified user creating or updating their own
 * member profile (ownerUid == uid) + isolated private/contact doc atomically.
 */
export async function saveSelfMemberToFirestore(
  member: MemberProfile,
  uid: string,
  isAdminUser: boolean,
  tracker: FirestoreSyncTracker
): Promise<void> {
  const docId = sanitizeId(member.id, 'mem');
  const memberRef = doc(db, 'members', docId);
  const contactRef = doc(db, 'members', docId, 'private', 'contact');
  const isExisting = tracker.memberIds.has(docId);

  const normalizedMember: MemberProfile = {
    ...member,
    id: docId,
    ownerUid: isAdminUser ? member.ownerUid : uid,
    dataOrigin: 'real',
  };

  const publicFields = await buildMemberPublicFields(normalizedMember, member.orderIndex ?? 0);
  const contactPayload = buildMemberPrivateContactPayload(docId, normalizedMember);

  const batch = writeBatch(db);
  if (isExisting) {
    if (isAdminUser) {
      batch.update(memberRef, publicFields);
    } else {
      // Tier 2 Owner update: strictly allowed fields only
      const { group: _g, orderIndex: _o, visibility: _v, ownerUid: _u, ...ownerAllowedFields } = publicFields;
      batch.update(memberRef, ownerAllowedFields);
    }
  } else {
    batch.set(memberRef, {
      id: docId,
      ...publicFields,
      group: isAdminUser ? publicFields.group : 'member',
      ownerUid: isAdminUser ? publicFields.ownerUid : uid,
      dataOrigin: 'real',
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
  }

  const hasContact = tracker.memberContactIds.has(docId);
  if (hasContact) {
    if (isAdminUser) {
      const { memberId: _m, ...adminContactFields } = contactPayload;
      batch.update(contactRef, adminContactFields);
    } else {
      const { memberId: _m, ownerUid: _u, ...ownerContactFields } = contactPayload;
      batch.update(contactRef, ownerContactFields);
    }
  } else {
    batch.set(contactRef, {
      ...contactPayload,
      ownerUid: isAdminUser ? contactPayload.ownerUid : uid,
    });
  }

  try {
    await batch.commit();
    tracker.memberIds.add(docId);
    tracker.memberContactIds.add(docId);
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, `members/${docId}`);
  }
}
