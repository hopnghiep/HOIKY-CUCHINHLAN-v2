import React, { useEffect, useState } from 'react';
import { Copy, Plus, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { AdminRecordItem } from '../../services/firestoreMemoir';
import { formatFirestoreUserMessage } from '../../services/firestoreError';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    data,
    updateSettings,
    currentUser,
    isAdmin,
    isBootstrapAdmin,
    notify,
    fetchAdminsList,
    addAdminByUid,
    removeAdminByUid,
  } = useMemoir();

  const [admins, setAdmins] = useState<AdminRecordItem[]>([]);
  const [newUid, setNewUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [adminMsg, setAdminMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    if (!isOpen || !isBootstrapAdmin) return;
    let active = true;
    fetchAdminsList()
      .then((list) => {
        if (active) setAdmins(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchAdminsList, isBootstrapAdmin, isOpen]);

  if (!isOpen) return null;

  const handleCopyUid = async () => {
    if (!currentUser?.uid) return;
    try {
      await navigator.clipboard.writeText(currentUser.uid);
      notify('Đã sao chép Firebase UID.', 'success');
    } catch {
      notify('Không thể sao chép tự động, vui lòng bôi đen để chép.', 'info');
    }
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);
    if (!newUid.trim() || !newEmail.trim()) {
      setAdminMsg({ type: 'err', text: 'Vui lòng nhập đầy đủ Firebase UID và Email.' });
      return;
    }
    setSavingAdmin(true);
    try {
      await addAdminByUid(newUid.trim(), newEmail.trim(), newDisplayName.trim() || newEmail.trim());
      setNewUid('');
      setNewEmail('');
      setNewDisplayName('');
      setAdminMsg({ type: 'ok', text: 'Đã cấp quyền Quản trị viên thành công trên Firestore.' });
      if (isBootstrapAdmin) {
        const list = await fetchAdminsList();
        setAdmins(list);
      }
    } catch (err) {
      setAdminMsg({ type: 'err', text: formatFirestoreUserMessage(err) });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRevokeAdmin = async (uid: string) => {
    try {
      await removeAdminByUid(uid);
      setAdmins((prev) => prev.filter((a) => a.uid !== uid));
    } catch (err) {
      setAdminMsg({ type: 'err', text: formatFirestoreUserMessage(err) });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#171719] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cài đặt"
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#242428] border border-white/10 text-zinc-200">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 id="settings-modal-title" className="text-xl font-semibold text-white">
              Cài đặt không gian Hồi ký
            </h2>
            <p className="text-xs text-zinc-400">Tùy chỉnh giao diện, đồng bộ Cloud Firestore và phân quyền Firebase.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-4">
            <div>
              <div className="text-sm font-medium text-white mb-2">Chế độ nền giao diện</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings({ themeMode: 'dark' })}
                  className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                    data.settings.themeMode === 'dark'
                      ? 'border-[#F02028] bg-[#F02028]/15 text-white'
                      : 'border-white/10 bg-[#171719] text-zinc-400 hover:text-white'
                  }`}
                >
                  Đen than chuẩn (#171719)
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ themeMode: 'neutral' })}
                  className={`rounded-lg px-3 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                    data.settings.themeMode === 'neutral'
                      ? 'border-[#F02028] bg-[#F02028]/15 text-white'
                      : 'border-white/10 bg-[#171719] text-zinc-400 hover:text-white'
                  }`}
                >
                  Xám trung tính sáng hơn
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-white">Tự động lưu khi chỉnh sửa</div>
                <div className="text-xs text-zinc-400">Lưu cục bộ và đồng bộ trực tiếp lên Cloud Firestore.</div>
              </div>
              <input
                type="checkbox"
                checked={data.settings.autoSaveEnabled}
                onChange={(e) => updateSettings({ autoSaveEnabled: e.target.checked })}
                className="h-4 w-4 accent-[#F02028]"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium text-white">Hiển thị nhãn phân biệt dữ liệu mẫu</div>
                <div className="text-xs text-zinc-400">Đánh dấu rõ hồ sơ minh họa và tư liệu chính thức.</div>
              </div>
              <input
                type="checkbox"
                checked={data.settings.showSampleBanner}
                onChange={(e) => updateSettings({ showSampleBanner: e.target.checked })}
                className="h-4 w-4 accent-[#F02028]"
              />
            </label>
          </div>

          {currentUser && (
            <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-white">Tài khoản Firebase đang đăng nhập</div>
                <span className="text-xs font-medium text-[#F02028]">
                  {isAdmin ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </div>
              <div className="text-xs text-zinc-300">
                {currentUser.displayName || 'Người dùng'} · {currentUser.email}
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#171719] px-3 py-2 text-xs">
                <span className="font-mono-num text-zinc-300 truncate">{currentUser.uid}</span>
                <button
                  type="button"
                  onClick={handleCopyUid}
                  className="inline-flex items-center gap-1 text-zinc-300 hover:text-white shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Chép UID</span>
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldCheck className="w-4 h-4 text-[#F02028]" />
                <span>Cấp quyền Quản trị viên (Firestore /admins)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Nhập Firebase UID và email Google của thành viên Ban Chấp hành để cấp quyền quản trị biên tập Hồi ký.
              </p>

              <form onSubmit={handleGrantAdmin} className="space-y-2.5">
                <input
                  type="text"
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  required
                  placeholder="Firebase UID người được cấp quyền..."
                  className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="Email Google"
                    className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Tên hiển thị"
                    className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>

                {adminMsg && (
                  <div
                    className={`text-xs rounded-lg px-3 py-2 ${
                      adminMsg.type === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                        : 'bg-[#F02028]/15 text-red-200 border border-[#F02028]/40'
                    }`}
                  >
                    {adminMsg.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingAdmin}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-60 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{savingAdmin ? 'Đang lưu...' : 'Cấp quyền Quản trị'}</span>
                  </button>
                </div>
              </form>

              {isBootstrapAdmin && admins.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="text-xs font-medium text-zinc-300">Danh sách Quản trị viên bổ sung ({admins.length})</div>
                  {admins.map((adm) => (
                    <div
                      key={adm.uid}
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#171719] px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{adm.displayName}</div>
                        <div className="text-zinc-400 truncate">{adm.email}</div>
                      </div>
                      {adm.uid !== currentUser?.uid && (
                        <button
                          type="button"
                          onClick={() => handleRevokeAdmin(adm.uid)}
                          aria-label="Thu hồi quyền quản trị"
                          className="rounded p-1.5 text-zinc-400 hover:text-[#F02028] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
