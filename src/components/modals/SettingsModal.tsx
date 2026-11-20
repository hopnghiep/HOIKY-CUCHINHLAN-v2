import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Frame,
  Palette,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { AdminRecordItem } from '../../services/firestoreMemoir';
import { formatFirestoreUserMessage } from '../../services/firestoreError';
import {
  FONT_OPTIONS,
  FRAME_OPTIONS,
  THEME_OPTIONS,
  resolveEffectiveFontPreset,
} from '../../constants/themes';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    data,
    displaySettings,
    hasLocalDisplayOverride,
    resetLocalDisplayPrefs,
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

  const effectiveFontId = resolveEffectiveFontPreset(displaySettings.themeMode, displaySettings.fontPreset);
  const effectiveFontMeta = FONT_OPTIONS.find((f) => f.id === effectiveFontId);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#171719] p-5 sm:p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cài đặt"
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 pr-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#242428] border border-white/10 text-zinc-200">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 id="settings-modal-title" className="text-xl font-semibold text-white">
              Cài đặt không gian Hồi ký
            </h2>
            <p className="text-xs text-zinc-400">
              Tùy chọn giao diện, phông chữ nghệ thuật THPT Hoàng Hoa Thám, đồng bộ & phân quyền.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* 1. Theme Palette Picker */}
          <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#F02028]" />
                <span className="text-sm font-semibold text-white">
                  Chủ đề màu sắc & Không gian trình bày
                </span>
              </div>
              {!isAdmin && hasLocalDisplayOverride && (
                <button
                  type="button"
                  onClick={resetLocalDisplayPrefs}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#171719] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-[#F02028]/60 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Dùng mặc định Chi đoàn</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {isAdmin
                ? 'Chủ đề Quản trị viên chọn sẽ áp dụng ngay và tự động lưu làm giao diện mặc định chung trên Cloud Firestore.'
                : 'Thành viên và khách xem có thể tùy chọn giao diện yêu thích — lựa chọn được lưu riêng trên thiết bị của bạn.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEME_OPTIONS.map((theme) => {
                const selected = displaySettings.themeMode === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updateSettings({ themeMode: theme.id })}
                    className={`group text-left rounded-xl border p-3 transition-all cursor-pointer ${
                      selected
                        ? 'border-[#F02028] bg-[#F02028]/15 shadow-sm'
                        : 'border-white/10 bg-[#171719] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-semibold text-white truncate">
                            {theme.name}
                          </span>
                        </div>
                        <div className="text-[10px] font-medium text-[#F02028] mt-0.5">{theme.tag}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {theme.swatches.map((hex, i) => (
                          <span
                            key={i}
                            className="h-3.5 w-3.5 rounded-full border border-white/25 shadow-xs"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                        {selected && (
                          <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#F02028] text-white">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">{theme.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Typography Presets */}
          <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#F02028]" />
                <span className="text-sm font-semibold text-white">Bộ phông chữ (Typography)</span>
              </div>
              {displaySettings.fontPreset === 'auto' && effectiveFontMeta && (
                <span className="text-[11px] text-zinc-400">
                  Đang dùng: <span className="text-white font-medium">{effectiveFontMeta.name}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FONT_OPTIONS.map((font) => {
                const selected = displaySettings.fontPreset === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => updateSettings({ fontPreset: font.id })}
                    className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                      selected
                        ? 'border-[#F02028] bg-[#F02028]/15'
                        : 'border-white/10 bg-[#171719] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{font.name}</span>
                      {selected && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F02028] text-white">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-1.5 text-sm font-semibold text-zinc-200 truncate"
                      style={{ fontFamily: font.previewDisplayFont }}
                    >
                      {font.sampleHeadline}
                    </div>
                    <div
                      className="mt-0.5 text-[10px] text-zinc-400 leading-snug"
                      style={{ fontFamily: font.previewBodyFont }}
                    >
                      {font.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Photo Frame & Presentation Style */}
          <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Frame className="w-4 h-4 text-[#F02028]" />
              <span className="text-sm font-semibold text-white">Kiểu khung ảnh & trình bày</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FRAME_OPTIONS.map((frame) => {
                const selected = displaySettings.frameStyle === frame.id;
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => updateSettings({ frameStyle: frame.id })}
                    className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${
                      selected
                        ? 'border-[#F02028] bg-[#F02028]/15'
                        : 'border-white/10 bg-[#171719] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{frame.name}</span>
                      {selected && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F02028] text-white">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-snug">{frame.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. General App Toggles */}
          <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-4">
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
                  <div className="text-xs font-medium text-zinc-300">
                    Danh sách Quản trị viên bổ sung ({admins.length})
                  </div>
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
