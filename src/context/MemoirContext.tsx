import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { INITIAL_MEMOIR_DATA, SCHEMA_VERSION } from '../data/initialData';
import type {
  ActiveTab,
  AppSettings,
  FontPreset,
  FrameStyle,
  MemberProfile,
  MemoirDatabase,
  SchoolEvent,
  ThemeMode,
} from '../types/memoir';
import {
  getThemeMeta,
  normalizeFontPreset,
  normalizeFrameStyle,
  normalizeThemeMode,
  resolveEffectiveFontPreset,
} from '../constants/themes';
import {
  listPreRestoreBackups,
  loadMemoirFromIndexedDB,
  saveMemoirToIndexedDB,
  savePreRestoreBackup,
  type LocalBackupSnapshot,
} from '../services/indexedDb';
import {
  clearStoredAdminToken,
  getAdminAuthHeaders,
  refreshFirebaseIdToken,
  setStoredAdminToken,
} from '../services/authToken';
import { auth, BOOTSTRAP_ADMIN_EMAIL, googleProvider } from '../firebase';
import {
  checkIsUserAdmin,
  createEmptySyncTracker,
  grantAdminRole,
  listAdminRecords,
  revokeAdminRole,
  saveSelfMemberToFirestore,
  subscribeMemoirFirestore,
  syncFullMemoirToFirestore,
  syncUserAccountDoc,
  type AdminRecordItem,
  type FirestoreSyncTracker,
} from '../services/firestoreMemoir';
import { formatFirestoreUserMessage } from '../services/firestoreError';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export type UserRole = 'guest' | 'member' | 'admin';

interface MemoirContextValue {
  data: MemoirDatabase;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  authReady: boolean;
  currentUser: User | null;
  isSignedIn: boolean;
  isAdmin: boolean;
  isBootstrapAdmin: boolean;
  userRole: UserRole;
  adminName: string | null;
  firestoreSynced: boolean;
  aiConfigured: boolean;
  canUndo: boolean;
  canRedo: boolean;
  pendingMemberIds: string[];
  toasts: ToastMessage[];
  backups: LocalBackupSnapshot[];
  notify: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  canEditMember: (member: MemberProfile) => boolean;
  updateData: (updater: (prev: MemoirDatabase) => MemoirDatabase, label?: string) => void;
  updateSelfMemberProfile: (updatedMember: MemberProfile, label?: string) => void;
  createOwnMemberProfile: (newMember: MemberProfile) => Promise<boolean>;
  publishMemberUpdate: (memberId?: string) => Promise<boolean>;
  saveAndPublishEvent: (event: SchoolEvent, options?: { syncToApp?: boolean }) => Promise<boolean>;
  undo: () => void;
  redo: () => void;
  syncNow: () => Promise<void>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  restoreFromPackage: (nextDb: MemoirDatabase, reason?: string) => Promise<void>;
  restoreFromSnapshot: (snapshotId: string) => Promise<void>;
  clearSampleData: () => Promise<void>;
  displaySettings: {
    themeMode: ThemeMode;
    fontPreset: FontPreset;
    frameStyle: FrameStyle;
  };
  hasLocalDisplayOverride: boolean;
  resetLocalDisplayPrefs: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  fetchAdminsList: () => Promise<AdminRecordItem[]>;
  addAdminByUid: (uid: string, email: string, displayName: string) => Promise<void>;
  removeAdminByUid: (uid: string) => Promise<void>;
}

const MemoirContext = createContext<MemoirContextValue | null>(null);

const MAX_HISTORY = 35;

const DISPLAY_PREFS_STORAGE_KEY = 'ccl_memoir_display_prefs_v4';
const CORPORATE_UPGRADE_MARKER = 'ccl_corporate_blue_v4_ready';

interface LocalDisplayPrefs {
  themeMode?: ThemeMode;
  fontPreset?: FontPreset;
  frameStyle?: FrameStyle;
}

function readLocalDisplayPrefs(): LocalDisplayPrefs {
  const corporateDefault: LocalDisplayPrefs = {
    themeMode: 'corporate_blue',
    fontPreset: 'corporate_inter',
    frameStyle: 'modern',
  };
  try {
    const raw = window.localStorage.getItem(DISPLAY_PREFS_STORAGE_KEY);
    if (!raw) {
      if (!window.localStorage.getItem(CORPORATE_UPGRADE_MARKER)) {
        window.localStorage.setItem(CORPORATE_UPGRADE_MARKER, '1');
        window.localStorage.setItem(DISPLAY_PREFS_STORAGE_KEY, JSON.stringify(corporateDefault));
        return corporateDefault;
      }
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: LocalDisplayPrefs = {};
    if (parsed.themeMode !== undefined) next.themeMode = normalizeThemeMode(parsed.themeMode);
    if (parsed.fontPreset !== undefined) next.fontPreset = normalizeFontPreset(parsed.fontPreset);
    if (parsed.frameStyle !== undefined) next.frameStyle = normalizeFrameStyle(parsed.frameStyle);
    return next;
  } catch {
    return corporateDefault;
  }
}

function writeLocalDisplayPrefs(prefs: LocalDisplayPrefs) {
  try {
    if (Object.keys(prefs).length === 0) {
      window.localStorage.removeItem(DISPLAY_PREFS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(DISPLAY_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
}

export function MemoirProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MemoirDatabase>(INITIAL_MEMOIR_DATA);
  const [localDisplayPrefs, setLocalDisplayPrefs] = useState<LocalDisplayPrefs>(() => readLocalDisplayPrefs());
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [firestoreSynced, setFirestoreSynced] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);

  const [historyPast, setHistoryPast] = useState<MemoirDatabase[]>([]);
  const [historyFuture, setHistoryFuture] = useState<MemoirDatabase[]>([]);
  const [pendingMemberIds, setPendingMemberIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [backups, setBackups] = useState<LocalBackupSnapshot[]>([]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  const pendingMemberIdsRef = useRef(pendingMemberIds);
  pendingMemberIdsRef.current = pendingMemberIds;

  const trackerRef = useRef<FirestoreSyncTracker>(createEmptySyncTracker());
  const lastCloudDbRef = useRef<MemoirDatabase | null>(null);
  const seedingInProgressRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authSeqRef = useRef(0);

  const notify = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshBackups = useCallback(async () => {
    const list = await listPreRestoreBackups();
    setBackups(list);
  }, []);

  // Load initial local cache & AI health status immediately on boot
  useEffect(() => {
    let active = true;
    async function loadLocalBootstrap() {
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok && active) {
          const healthJson = (await healthRes.json()) as { aiConfigured: boolean };
          setAiConfigured(Boolean(healthJson.aiConfigured));
        }
      } catch {
        // Ignore offline health error
      }

      const [cached, serverDb] = await Promise.all([
        loadMemoirFromIndexedDB(),
        fetch('/api/memoir')
          .then(async (res) => {
            if (!res.ok) return null;
            const json = (await res.json()) as MemoirDatabase;
            if (json && json.home && Array.isArray(json.members) && Array.isArray(json.events)) {
              return json;
            }
            return null;
          })
          .catch(() => null),
      ]);

      if (active) {
        const validCached =
          cached && cached.home && Array.isArray(cached.members) && Array.isArray(cached.events)
            ? cached
            : null;

        let chosen: MemoirDatabase | null = null;
        if (validCached && serverDb) {
          const cachedTime = Date.parse(validCached.lastModified || '') || 0;
          const serverTime = Date.parse(serverDb.lastModified || '') || 0;
          chosen = serverTime >= cachedTime ? serverDb : validCached;
        } else {
          chosen = serverDb || validCached;
        }

        if (chosen) {
          const normalized: MemoirDatabase = {
            ...chosen,
            cohorts: Array.isArray(chosen.cohorts) ? chosen.cohorts : [],
          };
          dataRef.current = normalized;
          setData(normalized);
          if (chosen === serverDb) {
            await saveMemoirToIndexedDB(normalized).catch(() => {});
          }
        } else {
          dataRef.current = INITIAL_MEMOIR_DATA;
          setData(INITIAL_MEMOIR_DATA);
          await saveMemoirToIndexedDB(INITIAL_MEMOIR_DATA).catch(() => {});
        }
        await refreshBackups();
        setIsLoading(false);
      }
    }
    void loadLocalBootstrap();
    return () => {
      active = false;
    };
  }, [refreshBackups]);

  // Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const seq = ++authSeqRef.current;

      if (!user) {
        clearStoredAdminToken();
        currentUserRef.current = null;
        isAdminRef.current = false;
        setCurrentUser(null);
        setIsAdmin(false);
        setFirestoreSynced(false);
        trackerRef.current = createEmptySyncTracker();
        lastCloudDbRef.current = null;
        setAuthReady(true);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        if (seq !== authSeqRef.current) return;
        setStoredAdminToken(idToken);
        const adminStatus = await checkIsUserAdmin(user);
        if (seq !== authSeqRef.current) return;
        currentUserRef.current = user;
        isAdminRef.current = adminStatus;
        setCurrentUser(user);
        setIsAdmin(adminStatus);
        setAuthReady(true);
        await syncUserAccountDoc(user, adminStatus).catch((err) => {
          console.warn('Could not sync user account doc:', err);
        });
      } catch (err) {
        if (seq !== authSeqRef.current) return;
        console.error('Auth initialization error:', err);
        currentUserRef.current = user;
        isAdminRef.current = false;
        setCurrentUser(user);
        setIsAdmin(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Attach real-time Firestore listeners ONLY when authReady && currentUser != null
  useEffect(() => {
    if (!authReady || !currentUser) {
      return;
    }

    const tracker = createEmptySyncTracker();
    trackerRef.current = tracker;
    seedingInProgressRef.current = false;

    const unsubscribe = subscribeMemoirFirestore(currentUser, isAdmin, tracker, {
      onSnapshotData: (cloudDb, hasConfigInCloud) => {
        if (!hasConfigInCloud) {
          // Empty Firestore DB: if current user is admin, seed Firestore automatically once
          if (isAdminRef.current && !seedingInProgressRef.current) {
            seedingInProgressRef.current = true;
            const seedSource = dataRef.current || INITIAL_MEMOIR_DATA;
            setIsSaving(true);
            syncFullMemoirToFirestore(null, seedSource, currentUser.uid, tracker, true)
              .then(() => {
                lastCloudDbRef.current = seedSource;
                setFirestoreSynced(true);
                setLastSavedAt(new Date().toISOString());
                notify('Đã khởi tạo và đồng bộ dữ liệu Hồi ký lên Cloud Firestore.', 'success');
              })
              .catch((err) => {
                seedingInProgressRef.current = false;
                notify(formatFirestoreUserMessage(err), 'error');
              })
              .finally(() => {
                setIsSaving(false);
              });
          }
          return;
        }

        lastCloudDbRef.current = cloudDb;
        setData(cloudDb);
        setFirestoreSynced(true);
        saveMemoirToIndexedDB(cloudDb).catch(() => {});
      },
      onError: (err) => {
        notify(formatFirestoreUserMessage(err), 'error');
      },
    });

    return () => {
      unsubscribe();
    };
  }, [authReady, currentUser, isAdmin, notify]);

  const displaySettings = useMemo(
    () => ({
      themeMode: normalizeThemeMode(localDisplayPrefs.themeMode ?? data.settings.themeMode),
      fontPreset: normalizeFontPreset(localDisplayPrefs.fontPreset ?? data.settings.fontPreset),
      frameStyle: normalizeFrameStyle(localDisplayPrefs.frameStyle ?? data.settings.frameStyle),
    }),
    [
      localDisplayPrefs.themeMode,
      localDisplayPrefs.fontPreset,
      localDisplayPrefs.frameStyle,
      data.settings.themeMode,
      data.settings.fontPreset,
      data.settings.frameStyle,
    ]
  );

  const hasLocalDisplayOverride =
    localDisplayPrefs.themeMode !== undefined ||
    localDisplayPrefs.fontPreset !== undefined ||
    localDisplayPrefs.frameStyle !== undefined;

  // Apply theme, typography, and frame attributes to document root
  useEffect(() => {
    const html = document.documentElement;
    const theme = displaySettings.themeMode;
    const effectiveFont = resolveEffectiveFontPreset(theme, displaySettings.fontPreset);
    const frame = displaySettings.frameStyle;
    const meta = getThemeMeta(theme);

    html.dataset.theme = theme;
    html.dataset.font = effectiveFont;
    html.dataset.frame = frame;

    if (meta.isLight || theme === 'neutral') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
  }, [displaySettings.themeMode, displaySettings.fontPreset, displaySettings.frameStyle]);

  const persistDatabase = useCallback(
    async (
      nextDb: MemoirDatabase,
      pushToCloud: boolean,
      forceFullWrite = false,
      fallbackPrevDb: MemoirDatabase | null = null
    ) => {
      setIsSaving(true);
      try {
        await saveMemoirToIndexedDB(nextDb);
        const user = currentUserRef.current;
        if (pushToCloud && user && isAdminRef.current) {
          await syncFullMemoirToFirestore(
            lastCloudDbRef.current ?? fallbackPrevDb,
            nextDb,
            user.uid,
            trackerRef.current,
            forceFullWrite
          );
          lastCloudDbRef.current = nextDb;
          setFirestoreSynced(true);
          // Mirror admin updates to server store so unauthenticated visitors see latest public data
          fetch('/api/memoir', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
            body: JSON.stringify(nextDb),
          }).catch(() => {});
        }
        setLastSavedAt(new Date().toISOString());
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const scheduleCloudSync = useCallback(
    (nextDb: MemoirDatabase, label?: string, fallbackPrevDb: MemoirDatabase | null = null) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      // Save locally right away for instant resilience, debounce Firestore write slightly for keystrokes
      saveMemoirToIndexedDB(nextDb).catch(() => {});
      syncTimerRef.current = setTimeout(() => {
        persistDatabase(nextDb, true, false, fallbackPrevDb)
          .then(() => {
            if (label) {
              notify(label, 'success');
            }
          })
          .catch((err) => {
            notify(formatFirestoreUserMessage(err), 'error');
          });
      }, 350);
    },
    [notify, persistDatabase]
  );

  const updateData = useCallback(
    (updater: (prev: MemoirDatabase) => MemoirDatabase, label?: string) => {
      const current = dataRef.current;
      const updatedRaw = updater(current);
      const nextDb: MemoirDatabase = {
        ...updatedRaw,
        schemaVersion: SCHEMA_VERSION,
        lastModified: new Date().toISOString(),
      };

      setHistoryPast((past) => [...past.slice(-(MAX_HISTORY - 1)), current]);
      setHistoryFuture([]);
      dataRef.current = nextDb;
      setData(nextDb);

      if (nextDb.settings.autoSaveEnabled || (isAdminRef.current && currentUserRef.current)) {
        scheduleCloudSync(nextDb, label, current);
      } else {
        saveMemoirToIndexedDB(nextDb).catch(() => {});
      }
    },
    [scheduleCloudSync]
  );

  const canEditMember = useCallback((_member: MemberProfile): boolean => {
    return true;
  }, []);

  const updateSelfMemberProfile = useCallback(
    (updatedMember: MemberProfile, label?: string) => {
      const current = dataRef.current;
      const user = currentUserRef.current;
      const nowIso = new Date().toISOString();

      const nextDb: MemoirDatabase = {
        ...current,
        schemaVersion: SCHEMA_VERSION,
        lastModified: nowIso,
        members: current.members.map((m) =>
          m.id === updatedMember.id
            ? {
                ...updatedMember,
                id: m.id,
                group: isAdminRef.current ? updatedMember.group : m.group,
                orderIndex: m.orderIndex,
                ownerUid: isAdminRef.current ? updatedMember.ownerUid : m.ownerUid,
                dataOrigin: 'real',
                updatedAt: nowIso,
              }
            : m
        ),
      };

      setHistoryPast((past) => [...past.slice(-(MAX_HISTORY - 1)), current]);
      setHistoryFuture([]);
      dataRef.current = nextDb;
      setData(nextDb);

      if (isAdminRef.current && user) {
        persistDatabase(nextDb, true, false, current)
          .then(() => {
            if (label) notify(label, 'success');
          })
          .catch((err) => {
            notify(formatFirestoreUserMessage(err), 'error');
          });
        return;
      }

      const targetMember = nextDb.members.find((m) => m.id === updatedMember.id);
      if (!targetMember) return;

      void (async () => {
        setIsSaving(true);
        try {
          await saveMemoirToIndexedDB(nextDb).catch(() => {});

          if (user && targetMember.ownerUid === user.uid) {
            await saveSelfMemberToFirestore(targetMember, user.uid, false, trackerRef.current);
            // Best-effort mirror to local server store
            fetch(`/api/members/${encodeURIComponent(targetMember.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member: targetMember, seedDatabase: nextDb }),
            }).catch(() => {});
            setPendingMemberIds((ids) => {
              const nextIds = ids.filter((id) => id !== targetMember.id);
              pendingMemberIdsRef.current = nextIds;
              return nextIds;
            });
            setLastSavedAt(new Date().toISOString());
            if (label !== '') {
              notify(label || 'Đã tự động lưu hồ sơ lên Cloud Firestore.', 'success');
            }
          } else {
            const res = await fetch(`/api/members/${encodeURIComponent(targetMember.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member: targetMember, seedDatabase: nextDb }),
            });
            if (!res.ok) {
              const errJson = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(errJson.error || 'Không thể tự động cập nhật hồ sơ lên máy chủ.');
            }
            setPendingMemberIds((ids) => {
              const nextIds = ids.filter((id) => id !== targetMember.id);
              pendingMemberIdsRef.current = nextIds;
              return nextIds;
            });
            setLastSavedAt(new Date().toISOString());
            if (label !== '') {
              notify(label || 'Đã tự động lưu và cập nhật hồ sơ thành viên.', 'success');
            }
          }
        } catch (err) {
          setPendingMemberIds((ids) => {
            const nextIds = ids.includes(targetMember.id) ? ids : [...ids, targetMember.id];
            pendingMemberIdsRef.current = nextIds;
            return nextIds;
          });
          notify(formatFirestoreUserMessage(err), 'error');
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [notify, persistDatabase]
  );

  const createOwnMemberProfile = useCallback(
    async (newMember: MemberProfile): Promise<boolean> => {
      const user = currentUserRef.current;
      if (!user) {
        notify('Vui lòng đăng nhập tài khoản Google để tạo hồ sơ thành viên.', 'error');
        return false;
      }
      setIsSaving(true);
      try {
        const ownedMember: MemberProfile = {
          ...newMember,
          group: isAdminRef.current ? newMember.group : 'member',
          ownerUid: isAdminRef.current ? newMember.ownerUid || user.uid : user.uid,
          orderIndex: dataRef.current.members.length,
          dataOrigin: 'real',
          updatedAt: new Date().toISOString(),
        };
        await saveSelfMemberToFirestore(ownedMember, user.uid, isAdminRef.current, trackerRef.current);
        setData((prev) => ({
          ...prev,
          lastModified: new Date().toISOString(),
          members: [...prev.members, ownedMember],
        }));
        setLastSavedAt(new Date().toISOString());
        notify(`Đã tạo và lưu hồ sơ "${ownedMember.fullName}" lên Cloud Firestore.`, 'success');
        return true;
      } catch (err) {
        notify(formatFirestoreUserMessage(err), 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [notify]
  );

  const publishMemberUpdate = useCallback(
    async (memberId?: string): Promise<boolean> => {
      const user = currentUserRef.current;
      const targetIds = memberId ? [memberId] : pendingMemberIdsRef.current;
      if (targetIds.length === 0) {
        return true;
      }

      setIsSaving(true);
      try {
        const current = dataRef.current;
        let syncedToCloud = false;

        for (const id of targetIds) {
          const target = current.members.find((m) => m.id === id);
          if (!target) continue;

          if (user && (isAdminRef.current || target.ownerUid === user.uid)) {
            await saveSelfMemberToFirestore(target, user.uid, isAdminRef.current, trackerRef.current);
            syncedToCloud = true;
            // Best-effort mirror to server store
            fetch(`/api/members/${encodeURIComponent(target.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member: target, seedDatabase: current }),
            }).catch(() => {});
          } else {
            const res = await fetch(`/api/members/${encodeURIComponent(target.id)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ member: target, seedDatabase: current }),
            });
            if (!res.ok) {
              const errJson = (await res.json().catch(() => ({}))) as { error?: string };
              throw new Error(errJson.error || 'Không thể cập nhật hồ sơ thành viên lên máy chủ.');
            }
          }
        }

        await saveMemoirToIndexedDB(current);
        setPendingMemberIds((prev) => {
          const next = prev.filter((id) => !targetIds.includes(id));
          pendingMemberIdsRef.current = next;
          return next;
        });
        setLastSavedAt(new Date().toISOString());
        notify(
          syncedToCloud
            ? 'Đã đồng bộ hồ sơ thành viên lên Cloud Firestore thành công.'
            : 'Đã cập nhật hồ sơ thành viên lên ứng dụng thành công.',
          'success'
        );
        return true;
      } catch (err) {
        notify(formatFirestoreUserMessage(err), 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [notify]
  );

  const saveAndPublishEvent = useCallback(
    async (targetEvent: SchoolEvent, options?: { syncToApp?: boolean }): Promise<boolean> => {
      const syncToApp = options?.syncToApp !== false;
      const current = dataRef.current;
      const normalizedEvent: SchoolEvent = {
        ...targetEvent,
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
      };
      const exists = current.events.some((e) => e.id === normalizedEvent.id);
      const nextDb: MemoirDatabase = {
        ...current,
        schemaVersion: SCHEMA_VERSION,
        lastModified: new Date().toISOString(),
        events: exists
          ? current.events.map((e) => (e.id === normalizedEvent.id ? normalizedEvent : e))
          : [normalizedEvent, ...current.events],
      };

      setHistoryPast((past) => [...past.slice(-(MAX_HISTORY - 1)), current]);
      setHistoryFuture([]);
      dataRef.current = nextDb;
      setData(nextDb);

      if (!syncToApp) {
        try {
          await saveMemoirToIndexedDB(nextDb);
          setLastSavedAt(new Date().toISOString());
          notify(`Đã lưu nội dung sự kiện "${normalizedEvent.title}".`, 'success');
          return true;
        } catch {
          notify('Không thể lưu nội dung sự kiện vào bộ nhớ cục bộ.', 'error');
          return false;
        }
      }

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }

      const user = currentUserRef.current;
      setIsSaving(true);
      try {
        if (user && isAdminRef.current) {
          await refreshFirebaseIdToken().catch(() => {});
          await persistDatabase(nextDb, true, false, current);
          // Also ensure event endpoint is mirrored
          fetch(`/api/events/${encodeURIComponent(normalizedEvent.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
            body: JSON.stringify({ event: normalizedEvent, seedDatabase: nextDb }),
          }).catch(() => {});
          notify(
            `Đã lưu và cập nhật sự kiện "${normalizedEvent.title}" lên Cloud Firestore.`,
            'success'
          );
          return true;
        }

        await saveMemoirToIndexedDB(nextDb);
        const res = await fetch(`/api/events/${encodeURIComponent(normalizedEvent.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: normalizedEvent, seedDatabase: nextDb }),
        });
        if (!res.ok) {
          const errJson = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || 'Không thể cập nhật sự kiện lên ứng dụng.');
        }
        setLastSavedAt(new Date().toISOString());
        notify(`Đã lưu và cập nhật sự kiện "${normalizedEvent.title}" lên ứng dụng.`, 'success');
        return true;
      } catch (err) {
        notify(formatFirestoreUserMessage(err), 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [notify, persistDatabase]
  );

  const undo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      const rest = past.slice(0, -1);
      const beforeUndo = dataRef.current;
      setHistoryFuture((future) => [beforeUndo, ...future]);
      dataRef.current = previous;
      setData(previous);
      persistDatabase(previous, true, false, beforeUndo).catch((err) => {
        notify(formatFirestoreUserMessage(err), 'error');
      });
      notify('Đã hoàn tác thao tác gần nhất.', 'info');
      return rest;
    });
  }, [notify, persistDatabase]);

  const redo = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const next = future[0];
      const rest = future.slice(1);
      const beforeRedo = dataRef.current;
      setHistoryPast((past) => [...past, beforeRedo]);
      dataRef.current = next;
      setData(next);
      persistDatabase(next, true, false, beforeRedo).catch((err) => {
        notify(formatFirestoreUserMessage(err), 'error');
      });
      notify('Đã làm lại thao tác vừa hoàn tác.', 'info');
      return rest;
    });
  }, [notify, persistDatabase]);

  const syncNow = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user) {
      if (pendingMemberIdsRef.current.length > 0) {
        await publishMemberUpdate();
        return;
      }
      await saveMemoirToIndexedDB(dataRef.current);
      notify('Đăng nhập bằng Google để đồng bộ trực tuyến với Cloud Firestore.', 'info');
      return;
    }

    try {
      setIsSaving(true);
      await refreshFirebaseIdToken();
      if (isAdminRef.current) {
        await persistDatabase(dataRef.current, true, true);
        setPendingMemberIds([]);
        notify('Đã đồng bộ toàn bộ dữ liệu Hồi ký lên Cloud Firestore.', 'success');
      } else if (pendingMemberIdsRef.current.length > 0) {
        await publishMemberUpdate();
      } else {
        await saveMemoirToIndexedDB(dataRef.current);
        notify('Dữ liệu đang được đồng bộ thời gian thực với Cloud Firestore.', 'success');
      }
    } catch (err) {
      notify(formatFirestoreUserMessage(err), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [notify, persistDatabase, publishMemberUpdate]);

  const signInWithGoogle = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const user = credential.user;
      const idToken = await user.getIdToken();
      setStoredAdminToken(idToken);
      const adminStatus = await checkIsUserAdmin(user);
      setIsAdmin(adminStatus);
      isAdminRef.current = adminStatus;
      await syncUserAccountDoc(user, adminStatus).catch(() => {});
      notify(
        adminStatus
          ? `Đăng nhập thành công (${user.displayName || user.email}) — Chế độ Quản trị viên.`
          : `Đăng nhập thành công (${user.displayName || user.email}) — Chế độ Thành viên.`,
        'success'
      );
      return { ok: true };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        return { ok: false, error: 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.' };
      }
      if (code === 'auth/popup-blocked') {
        return { ok: false, error: 'Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup và thử lại.' };
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Không thể đăng nhập bằng Google.',
      };
    }
  }, [notify]);

  const logoutAdmin = useCallback(async () => {
    try {
      await signOut(auth);
    } finally {
      clearStoredAdminToken();
      setCurrentUser(null);
      setIsAdmin(false);
      setFirestoreSynced(false);
      if (activeTab === 'admin') {
        setActiveTab('home');
      }
      notify('Đã đăng xuất khỏi tài khoản Firebase.', 'info');
    }
  }, [activeTab, notify]);

  const restoreFromPackage = useCallback(
    async (nextDb: MemoirDatabase, reason = 'Trước khi nhập gói sao lưu JSON') => {
      await savePreRestoreBackup(dataRef.current, reason);
      await refreshBackups();

      setHistoryPast((past) => [...past.slice(-(MAX_HISTORY - 1)), dataRef.current]);
      setHistoryFuture([]);
      setData(nextDb);
      await persistDatabase(nextDb, true, true);
      notify('Đã tạo bản sao lưu an toàn và phục hồi toàn bộ dữ liệu lên Cloud Firestore.', 'success');
    },
    [notify, persistDatabase, refreshBackups]
  );

  const restoreFromSnapshot = useCallback(
    async (snapshotId: string) => {
      const target = backups.find((b) => b.id === snapshotId);
      if (!target) {
        notify('Không tìm thấy bản sao lưu đã chọn.', 'error');
        return;
      }
      await savePreRestoreBackup(dataRef.current, 'Trước khi khôi phục điểm lưu');
      setData(target.data);
      await persistDatabase(target.data, true, true);
      await refreshBackups();
      notify('Đã khôi phục dữ liệu từ điểm sao lưu an toàn lên Cloud Firestore.', 'success');
    },
    [backups, notify, persistDatabase, refreshBackups]
  );

  const clearSampleData = useCallback(async () => {
    await savePreRestoreBackup(dataRef.current, 'Trước khi xóa dữ liệu mẫu ban đầu');
    await refreshBackups();

    const current = dataRef.current;
    const cleaned: MemoirDatabase = {
      ...current,
      lastModified: new Date().toISOString(),
      home: {
        ...current.home,
        dataOrigin: 'real',
        history: {
          ...current.home.history,
          foundingContent:
            current.home.dataOrigin === 'sample'
              ? 'Ban Quản trị đang cập nhật tư liệu lịch sử hình thành chính thức của Chi đoàn Cù Chính Lan.'
              : current.home.history.foundingContent,
          stages: current.home.dataOrigin === 'sample' ? [] : current.home.history.stages,
          achievementsSummary:
            current.home.dataOrigin === 'sample'
              ? 'Đang cập nhật thành tích chính thức qua các nhiệm kỳ.'
              : current.home.history.achievementsSummary,
        },
      },
      milestones: current.milestones.filter((m) => m.dataOrigin !== 'sample'),
      leaderMessages: current.leaderMessages.filter((l) => l.dataOrigin !== 'sample'),
      cohorts: (current.cohorts || []).filter((c) => c.dataOrigin !== 'sample'),
      members: current.members.filter((m) => m.dataOrigin !== 'sample'),
      events: current.events.filter((e) => e.dataOrigin !== 'sample'),
      settings: {
        ...current.settings,
        showSampleBanner: false,
      },
    };

    setHistoryPast((past) => [...past.slice(-(MAX_HISTORY - 1)), current]);
    setHistoryFuture([]);
    setData(cleaned);
    await persistDatabase(cleaned, true, true);
    notify('Đã gỡ bỏ toàn bộ dữ liệu mẫu minh họa trên Cloud Firestore.', 'success');
  }, [notify, persistDatabase, refreshBackups]);

  const resetLocalDisplayPrefs = useCallback(() => {
    setLocalDisplayPrefs({});
    writeLocalDisplayPrefs({});
    notify('Đã khôi phục giao diện mặc định của Chi đoàn.', 'info');
  }, [notify]);

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      const hasDisplayPatch =
        patch.themeMode !== undefined ||
        patch.fontPreset !== undefined ||
        patch.frameStyle !== undefined;

      if (isAdminRef.current && currentUserRef.current) {
        if (hasDisplayPatch) {
          setLocalDisplayPrefs((prev) => {
            const next = { ...prev };
            if (patch.themeMode !== undefined) delete next.themeMode;
            if (patch.fontPreset !== undefined) delete next.fontPreset;
            if (patch.frameStyle !== undefined) delete next.frameStyle;
            writeLocalDisplayPrefs(next);
            return next;
          });
        }
        updateData((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            ...patch,
          },
        }));
      } else {
        if (hasDisplayPatch) {
          setLocalDisplayPrefs((prev) => {
            const next: LocalDisplayPrefs = {
              ...prev,
              ...(patch.themeMode !== undefined ? { themeMode: normalizeThemeMode(patch.themeMode) } : {}),
              ...(patch.fontPreset !== undefined ? { fontPreset: normalizeFontPreset(patch.fontPreset) } : {}),
              ...(patch.frameStyle !== undefined ? { frameStyle: normalizeFrameStyle(patch.frameStyle) } : {}),
            };
            writeLocalDisplayPrefs(next);
            return next;
          });
        }
        const nonDisplayPatch: Partial<AppSettings> = {};
        if (patch.showSampleBanner !== undefined) nonDisplayPatch.showSampleBanner = patch.showSampleBanner;
        if (patch.autoSaveEnabled !== undefined) nonDisplayPatch.autoSaveEnabled = patch.autoSaveEnabled;
        if (patch.compactCards !== undefined) nonDisplayPatch.compactCards = patch.compactCards;
        if (Object.keys(nonDisplayPatch).length > 0) {
          setData((prev) => ({
            ...prev,
            settings: {
              ...prev.settings,
              ...nonDisplayPatch,
            },
          }));
        }
      }
    },
    [updateData]
  );

  const fetchAdminsList = useCallback(async (): Promise<AdminRecordItem[]> => {
    return listAdminRecords();
  }, []);

  const addAdminByUid = useCallback(
    async (uid: string, email: string, displayName: string) => {
      const user = currentUserRef.current;
      if (!user || !isAdminRef.current) {
        throw new Error('Chỉ Quản trị viên mới có thể cấp quyền quản trị.');
      }
      await grantAdminRole(uid, email, displayName, user.uid);
      notify(`Đã cấp quyền Quản trị viên cho ${displayName || email}.`, 'success');
    },
    [notify]
  );

  const removeAdminByUid = useCallback(
    async (uid: string) => {
      if (!isAdminRef.current) {
        throw new Error('Chỉ Quản trị viên mới có thể thu hồi quyền quản trị.');
      }
      await revokeAdminRole(uid);
      notify('Đã thu hồi quyền Quản trị viên.', 'info');
    },
    [notify]
  );

  const isBootstrapAdmin = Boolean(
    currentUser?.emailVerified &&
      currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );

  const userRole: UserRole = !currentUser ? 'guest' : isAdmin ? 'admin' : 'member';
  const adminName = currentUser?.displayName || currentUser?.email || null;

  return (
    <MemoirContext.Provider
      value={{
        data,
        activeTab,
        setActiveTab,
        isLoading,
        isSaving,
        lastSavedAt,
        authReady,
        currentUser,
        isSignedIn: Boolean(currentUser),
        isAdmin,
        isBootstrapAdmin,
        userRole,
        adminName,
        firestoreSynced,
        aiConfigured,
        canUndo: historyPast.length > 0,
        canRedo: historyFuture.length > 0,
        pendingMemberIds,
        toasts,
        backups,
        notify,
        dismissToast,
        canEditMember,
        updateData,
        updateSelfMemberProfile,
        createOwnMemberProfile,
        publishMemberUpdate,
        saveAndPublishEvent,
        undo,
        redo,
        syncNow,
        signInWithGoogle,
        logoutAdmin,
        restoreFromPackage,
        restoreFromSnapshot,
        clearSampleData,
        displaySettings,
        hasLocalDisplayOverride,
        resetLocalDisplayPrefs,
        updateSettings,
        fetchAdminsList,
        addAdminByUid,
        removeAdminByUid,
      }}
    >
      {children}
    </MemoirContext.Provider>
  );
}

export function useMemoir(): MemoirContextValue {
  const ctx = useContext(MemoirContext);
  if (!ctx) {
    throw new Error('useMemoir must be used inside MemoirProvider.');
  }
  return ctx;
}
