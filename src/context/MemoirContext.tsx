import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { INITIAL_MEMOIR_DATA, SCHEMA_VERSION } from '../data/initialData';
import type { ActiveTab, AppSettings, MemberProfile, MemoirDatabase } from '../types/memoir';
import {
  listPreRestoreBackups,
  loadMemoirFromIndexedDB,
  saveMemoirToIndexedDB,
  savePreRestoreBackup,
  type LocalBackupSnapshot,
} from '../services/indexedDb';
import {
  clearStoredAdminToken,
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
  undo: () => void;
  redo: () => void;
  syncNow: () => Promise<void>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  restoreFromPackage: (nextDb: MemoirDatabase, reason?: string) => Promise<void>;
  restoreFromSnapshot: (snapshotId: string) => Promise<void>;
  clearSampleData: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  fetchAdminsList: () => Promise<AdminRecordItem[]>;
  addAdminByUid: (uid: string, email: string, displayName: string) => Promise<void>;
  removeAdminByUid: (uid: string) => Promise<void>;
}

const MemoirContext = createContext<MemoirContextValue | null>(null);

const MAX_HISTORY = 35;

export function MemoirProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MemoirDatabase>(INITIAL_MEMOIR_DATA);
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

      const cached = await loadMemoirFromIndexedDB();
      if (active) {
        if (cached && cached.home && Array.isArray(cached.members) && Array.isArray(cached.events)) {
          const normalized: MemoirDatabase = {
            ...cached,
            cohorts: Array.isArray(cached.cohorts) ? cached.cohorts : [],
          };
          setData(normalized);
        } else {
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
      setCurrentUser(user);
      currentUserRef.current = user;

      if (!user) {
        clearStoredAdminToken();
        setIsAdmin(false);
        isAdminRef.current = false;
        setFirestoreSynced(false);
        trackerRef.current = createEmptySyncTracker();
        lastCloudDbRef.current = null;
        setAuthReady(true);
        return;
      }

      try {
        const idToken = await user.getIdToken();
        setStoredAdminToken(idToken);
        const adminStatus = await checkIsUserAdmin(user);
        setIsAdmin(adminStatus);
        isAdminRef.current = adminStatus;
        await syncUserAccountDoc(user, adminStatus).catch((err) => {
          console.warn('Could not sync user account doc:', err);
        });
      } catch (err) {
        console.error('Auth initialization error:', err);
        setIsAdmin(false);
        isAdminRef.current = false;
      } finally {
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

  // Apply theme class to document root
  useEffect(() => {
    const html = document.documentElement;
    if (data.settings.themeMode === 'neutral') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
  }, [data.settings.themeMode]);

  const persistDatabase = useCallback(
    async (nextDb: MemoirDatabase, pushToCloud: boolean, forceFullWrite = false) => {
      setIsSaving(true);
      try {
        await saveMemoirToIndexedDB(nextDb);
        const user = currentUserRef.current;
        if (pushToCloud && user && isAdminRef.current) {
          await syncFullMemoirToFirestore(
            lastCloudDbRef.current,
            nextDb,
            user.uid,
            trackerRef.current,
            forceFullWrite
          );
          lastCloudDbRef.current = nextDb;
          setFirestoreSynced(true);
        }
        setLastSavedAt(new Date().toISOString());
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const scheduleCloudSync = useCallback(
    (nextDb: MemoirDatabase, label?: string) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      // Save locally right away for instant resilience, debounce Firestore write slightly for keystrokes
      saveMemoirToIndexedDB(nextDb).catch(() => {});
      syncTimerRef.current = setTimeout(() => {
        persistDatabase(nextDb, true, false)
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
      setData(nextDb);

      if (nextDb.settings.autoSaveEnabled) {
        scheduleCloudSync(nextDb, label);
      } else {
        saveMemoirToIndexedDB(nextDb).catch(() => {});
      }
    },
    [scheduleCloudSync]
  );

  const canEditMember = useCallback(
    (member: MemberProfile): boolean => {
      if (isAdmin) return true;
      if (!currentUser) return false;
      return Boolean(member.ownerUid && member.ownerUid === currentUser.uid);
    },
    [currentUser, isAdmin]
  );

  const updateSelfMemberProfile = useCallback(
    (updatedMember: MemberProfile, label?: string) => {
      const current = dataRef.current;
      const user = currentUserRef.current;
      const nextDb: MemoirDatabase = {
        ...current,
        schemaVersion: SCHEMA_VERSION,
        lastModified: new Date().toISOString(),
        members: current.members.map((m) =>
          m.id === updatedMember.id
            ? {
                ...updatedMember,
                id: m.id,
                group: isAdminRef.current ? updatedMember.group : m.group,
                orderIndex: m.orderIndex,
                ownerUid: isAdminRef.current ? updatedMember.ownerUid : m.ownerUid,
                dataOrigin: 'real',
                updatedAt: new Date().toISOString(),
              }
            : m
        ),
      };

      setHistoryPast((past) => [...past.slice(-(MAX_HISTORY - 1)), current]);
      setHistoryFuture([]);
      setData(nextDb);

      if (isAdminRef.current && user) {
        persistDatabase(nextDb, true, false)
          .then(() => {
            if (label) notify(label, 'success');
          })
          .catch((err) => {
            notify(formatFirestoreUserMessage(err), 'error');
          });
      } else {
        setPendingMemberIds((ids) => (ids.includes(updatedMember.id) ? ids : [...ids, updatedMember.id]));
        saveMemoirToIndexedDB(nextDb)
          .then(() => {
            setLastSavedAt(new Date().toISOString());
            notify(
              label || 'Đã lưu thay đổi cục bộ. Nhấn nút "Cập nhật" để đồng bộ lên Cloud Firestore.',
              'info'
            );
          })
          .catch(() => {});
      }
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
      if (!user) {
        notify('Vui lòng đăng nhập Google (Firebase Auth) để đồng bộ hồ sơ lên Cloud Firestore.', 'error');
        return false;
      }

      const targetIds = memberId ? [memberId] : pendingMemberIdsRef.current;
      if (targetIds.length === 0) {
        return true;
      }

      setIsSaving(true);
      try {
        const current = dataRef.current;
        for (const id of targetIds) {
          const target = current.members.find((m) => m.id === id);
          if (!target) continue;
          if (!isAdminRef.current && target.ownerUid !== user.uid) {
            throw new Error(
              'Bạn chỉ có quyền cập nhật lên Cloud Firestore cho hồ sơ thuộc tài khoản Google của mình (hoặc nhờ Quản trị viên liên kết UID).'
            );
          }
          await saveSelfMemberToFirestore(target, user.uid, isAdminRef.current, trackerRef.current);
        }
        await saveMemoirToIndexedDB(current);
        setPendingMemberIds((prev) => prev.filter((id) => !targetIds.includes(id)));
        setLastSavedAt(new Date().toISOString());
        notify('Đã đồng bộ hồ sơ thành viên lên Cloud Firestore thành công.', 'success');
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

  const undo = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const previous = past[past.length - 1];
      const rest = past.slice(0, -1);
      setHistoryFuture((future) => [dataRef.current, ...future]);
      setData(previous);
      persistDatabase(previous, true, false).catch((err) => {
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
      setHistoryPast((past) => [...past, dataRef.current]);
      setData(next);
      persistDatabase(next, true, false).catch((err) => {
        notify(formatFirestoreUserMessage(err), 'error');
      });
      notify('Đã làm lại thao tác vừa hoàn tác.', 'info');
      return rest;
    });
  }, [notify, persistDatabase]);

  const syncNow = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user) {
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

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      updateData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...patch,
        },
      }));
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
        undo,
        redo,
        syncNow,
        signInWithGoogle,
        logoutAdmin,
        restoreFromPackage,
        restoreFromSnapshot,
        clearSampleData,
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
