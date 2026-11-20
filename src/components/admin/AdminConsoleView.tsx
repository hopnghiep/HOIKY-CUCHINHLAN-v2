import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  FileJson,
  FolderPlus,
  Music,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import {
  buildExportPackage,
  computeMemoirStats,
  downloadBackupJson,
  validateImportJson,
  type ImportValidationResult,
} from '../../services/backupService';
import { uploadOrEncodeMedia } from '../../services/indexedDb';
import type {
  AnthemYoutubeTrack,
  CohortItem,
  EventCategory,
  MemberProfile,
  SchoolEvent,
} from '../../types/memoir';
import { MemberFormModal } from '../members/MemberFormModal';
import { CohortFormModal } from '../members/CohortFormModal';
import { EventFormModal } from '../events/EventFormModal';
import { ResilientImage } from '../common/ResilientMedia';

type AdminTabId = 'stats_backup' | 'home_history' | 'members' | 'events' | 'anthem_social';

export function AdminConsoleView() {
  const {
    data,
    isAdmin,
    isSaving,
    adminName,
    lastSavedAt,
    backups,
    updateData,
    saveAndPublishEvent,
    restoreFromPackage,
    restoreFromSnapshot,
    clearSampleData,
    notify,
  } = useMemoir();

  const [tab, setTab] = useState<AdminTabId>('stats_backup');
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmClearSample, setConfirmClearSample] = useState(false);

  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const [editingCohort, setEditingCohort] = useState<CohortItem | null>(null);
  const [cohortModalOpen, setCohortModalOpen] = useState(false);

  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialLabel, setNewSocialLabel] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  const [ytTitle, setYtTitle] = useState('');
  const [ytAuthor, setYtAuthor] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytNotes, setYtNotes] = useState('');
  const [editingYtId, setEditingYtId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#171719] p-12 text-center space-y-3">
        <h2 className="font-display text-2xl font-semibold text-white">Khu vực Quản trị Hệ thống</h2>
        <p className="text-sm text-zinc-400">
          Vui lòng đăng nhập tài khoản Quản trị viên để truy cập các công cụ quản lý và sao lưu dữ liệu.
        </p>
      </div>
    );
  }

  const stats = computeMemoirStats(data);
  const sampleCount =
    (data.home.dataOrigin === 'sample' ? 1 : 0) +
    data.milestones.filter((m) => m.dataOrigin === 'sample').length +
    data.leaderMessages.filter((l) => l.dataOrigin === 'sample').length +
    (data.cohorts || []).filter((c) => c.dataOrigin === 'sample').length +
    data.members.filter((m) => m.dataOrigin === 'sample').length +
    data.events.filter((e) => e.dataOrigin === 'sample').length;

  const handleExport = async () => {
    setExporting(true);
    try {
      const pkg = await buildExportPackage(data);
      const filename = downloadBackupJson(pkg);
      notify(`Đã xuất gói sao lưu: ${filename}`, 'success');
    } catch {
      notify('Không thể xuất tệp sao lưu JSON.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSelectImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validation = validateImportJson(text);
      setImportResult(validation);
      if (!validation.valid) {
        notify('Tệp sao lưu không hợp lệ. Dữ liệu hiện tại được giữ nguyên an toàn.', 'error');
      }
    } catch {
      setImportResult({
        valid: false,
        errors: ['Không thể đọc tệp đã chọn.'],
        warnings: [],
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!importResult?.valid || !importResult.parsedDatabase) return;
    setImporting(true);
    try {
      await restoreFromPackage(importResult.parsedDatabase);
      setImportResult(null);
    } catch {
      notify('Lỗi khi phục hồi dữ liệu.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadOrEncodeMedia(file, 'image');
      updateData(
        (prev) => ({
          ...prev,
          home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, heroImage: res.url } },
        }),
        'Đã cập nhật ảnh bìa Trang chủ.'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải ảnh.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleAnthemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadOrEncodeMedia(file, 'image');
      updateData(
        (prev) => ({
          ...prev,
          home: { ...prev.home, dataOrigin: 'real', anthem: { ...prev.home.anthem, coverImage: res.url } },
        }),
        'Đã cập nhật ảnh minh họa Hành khúc.'
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải ảnh.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const adminTabs: { id: AdminTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'stats_backup', label: 'Thống kê & Sao lưu', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'home_history', label: 'Trang chủ & Lịch sử', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'members', label: 'Thành viên / Khách', icon: <Users className="w-4 h-4" /> },
    { id: 'events', label: 'Quản lý Sự kiện', icon: <Calendar className="w-4 h-4" /> },
    { id: 'anthem_social', label: 'Bài ca & Mạng xã hội', icon: <Music className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Console Header */}
      <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="text-xs font-medium text-[#F02028]">
              Quản trị hệ thống · Phiên làm việc: {adminName || 'Admin'}
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-semibold text-white">
              Admin Console — Hồi ký Chi đoàn Cù Chính Lan
            </h1>
          </div>
          {lastSavedAt && (
            <div className="text-xs text-zinc-400 font-mono-num">
              Lưu gần nhất: {new Date(lastSavedAt).toLocaleTimeString('vi-VN')}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {adminTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                tab === t.id
                  ? 'bg-[#F02028] text-white'
                  : 'border border-white/10 bg-[#242428] text-zinc-300 hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* TAB A: THỐNG KÊ & SAO LƯU */}
      {tab === 'stats_backup' && (
        <div className="space-y-6">
          {/* Quantitative Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Tổng đoàn viên', value: stats.membersCount },
              { label: 'Tổng khách mời / người có liên quan', value: stats.guestsCount },
              { label: 'Tổng sự kiện', value: stats.eventsCount },
              { label: 'Tổng bài viết & lời ngỏ', value: stats.articlesCount },
              { label: 'Tổng hình ảnh', value: stats.imagesCount },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-[#242428] p-5">
                <div className="text-xs text-zinc-400">{item.label}</div>
                <div className="mt-2 font-mono-num text-3xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Export & Import Backup Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export */}
            <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Download className="w-5 h-5 text-[#F02028]" />
                <h2 className="font-display text-xl font-semibold text-white">Xuất gói sao lưu JSON</h2>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Đóng gói toàn bộ dữ liệu Trang chủ, Lịch sử, Mốc son, Lời ngỏ, Hồ sơ thành viên, Sự kiện, Bài hát,
                Cấu hình và toàn bộ dữ liệu hình ảnh thành một tệp JSON duy nhất có tên gắn ngày giờ xuất.
              </p>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F02028] px-5 py-3 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-50 cursor-pointer"
              >
                <FileJson className="w-4 h-4" />
                <span>{exporting ? 'Đang đóng gói hình ảnh & JSON...' : 'Xuất dữ liệu sao lưu ngay (.json)'}</span>
              </button>
            </section>

            {/* Import */}
            <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-[#F02028]" />
                <h2 className="font-display text-xl font-semibold text-white">Nhập & Phục hồi từ tệp JSON</h2>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Hệ thống kiểm tra cấu trúc phiên bản trước khi nhập, hiển thị tóm tắt dữ liệu sẽ phục hồi và tự động
                tạo bản sao lưu dự phòng trước khi ghi đè.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleSelectImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#242428] px-5 py-3 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#F02028]" />
                <span>Chọn tệp sao lưu JSON</span>
              </button>

              {importResult && (
                <div
                  className={`rounded-2xl border p-4 space-y-3 text-xs ${
                    importResult.valid
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                      : 'border-[#F02028]/50 bg-[#F02028]/10 text-red-100'
                  }`}
                >
                  {!importResult.valid ? (
                    <div className="space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-[#F02028]" />
                        Tệp không hợp lệ — không ghi đè dữ liệu:
                      </div>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    importResult.preview && (
                      <div className="space-y-3">
                        <div className="font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          Tệp hợp lệ — Xem trước dữ liệu sẽ phục hồi:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-zinc-200">
                          <div>Phiên bản: {importResult.preview.schemaVersion}</div>
                          <div>Đoàn viên: {importResult.preview.membersCount}</div>
                          <div>Khách mời / Liên quan: {importResult.preview.guestsCount}</div>
                          <div>Sự kiện: {importResult.preview.eventsCount}</div>
                          <div>Mốc son: {importResult.preview.milestonesCount}</div>
                          <div>Hình ảnh: {importResult.preview.imagesCount}</div>
                        </div>
                        {importResult.warnings.length > 0 && (
                          <div className="text-amber-200">{importResult.warnings.join(' ')}</div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleConfirmRestore}
                            disabled={importing}
                            className="rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                          >
                            {importing ? 'Đang phục hồi...' : 'Xác nhận ghi đè & Phục hồi'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportResult(null)}
                            className="rounded-xl border border-white/15 px-3.5 py-2 text-xs text-zinc-200 cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sample Data Replacement + Auto Safety Snapshots */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-white">
                Chuyển đổi từ dữ liệu mẫu sang tư liệu thực tế
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Hiện có <span className="font-mono-num font-semibold text-white">{sampleCount}</span> phân mục đang gắn
                nhãn dữ liệu mẫu minh họa. Bạn có thể giữ để tham khảo hoặc xóa sạch toàn bộ dữ liệu mẫu (hệ thống tự
                động lưu dự phòng trước khi xóa).
              </p>

              {!confirmClearSample ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearSample(true)}
                  disabled={sampleCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#F02028]/50 bg-[#F02028]/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#F02028]/25 disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-[#F02028]" />
                  <span>
                    {sampleCount === 0 ? 'Không còn dữ liệu mẫu' : 'Xóa toàn bộ dữ liệu mẫu để nhập dữ liệu thật'}
                  </span>
                </button>
              ) : (
                <div className="rounded-xl border border-[#F02028]/50 bg-[#242428] p-4 space-y-3">
                  <div className="text-xs text-zinc-200">
                    Xác nhận xóa tất cả các bản ghi mẫu? Bản ghi thật do bạn nhập sẽ được giữ nguyên và hệ thống sẽ lưu
                    một bản dự phòng trước khi thực hiện.
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await clearSampleData();
                        setConfirmClearSample(false);
                      }}
                      className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Xác nhận xóa dữ liệu mẫu
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearSample(false)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-white">
                Bản sao lưu dự phòng tự động ({backups.length})
              </h3>
              {backups.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  Chưa có bản dự phòng nào. Hệ thống sẽ tự tạo mỗi khi bạn nhập tệp JSON hoặc xóa dữ liệu mẫu.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {backups.map((snap) => (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-white truncate">{snap.reason}</div>
                        <div className="font-mono-num text-[11px] text-zinc-400">
                          {new Date(snap.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => restoreFromSnapshot(snap.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#171719] px-2.5 py-1.5 text-xs text-zinc-200 hover:border-[#F02028] shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#F02028]" />
                        Khôi phục
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* TAB B: TRANG CHỦ & LỊCH SỬ */}
      {tab === 'home_history' && (
        <div className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-6 text-sm">
          <h2 className="font-display text-xl font-semibold text-white">Biên tập nội dung Trang chủ & Lịch sử</h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nhãn không gian hồi ký</label>
                <input
                  type="text"
                  value={data.home.hero.spaceLabel}
                  onChange={(e) =>
                    updateData((prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, spaceLabel: e.target.value } },
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Tiêu đề lớn Trang chủ</label>
                <input
                  type="text"
                  value={data.home.hero.title}
                  onChange={(e) =>
                    updateData((prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, title: e.target.value } },
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Đơn vị trực thuộc</label>
                <input
                  type="text"
                  value={data.home.hero.unitIntro}
                  onChange={(e) =>
                    updateData((prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, unitIntro: e.target.value } },
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Mô tả giới thiệu Hero</label>
                <textarea
                  rows={3}
                  value={data.home.hero.subtitle}
                  onChange={(e) =>
                    updateData((prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, subtitle: e.target.value } },
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-3 rounded-2xl border border-white/10 bg-[#242428] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Ảnh bìa Trang chủ</span>
                <label className="inline-flex items-center gap-1 rounded-lg bg-[#F02028] px-3 py-1 text-xs font-semibold text-white cursor-pointer">
                  <Upload className="w-3 h-3" />
                  Đổi ảnh
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleHeroImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-white/10">
                <ResilientImage
                  src={data.home.hero.heroImage}
                  alt="Ảnh bìa Trang chủ"
                  downloadFileName="anh-bia-trang-chu"
                  viewerSubtitle="Ảnh bìa Trang chủ"
                  canEdit
                  onChangeImage={(nextUrl) =>
                    updateData(
                      (prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          hero: { ...prev.home.hero, heroImage: nextUrl },
                        },
                      }),
                      'Đã lưu ảnh bìa Trang chủ.'
                    )
                  }
                  onDeleteImage={() =>
                    updateData(
                      (prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          hero: { ...prev.home.hero, heroImage: '' },
                        },
                      }),
                      'Đã xóa ảnh bìa Trang chủ.'
                    )
                  }
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-white/10">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nội dung Lịch sử hình thành</label>
              <textarea
                rows={5}
                value={data.home.history.foundingContent}
                onChange={(e) =>
                  updateData((prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      history: { ...prev.home.history, foundingContent: e.target.value },
                    },
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Dấu ấn và Thành tựu</label>
              <textarea
                rows={5}
                value={data.home.history.achievementsSummary}
                onChange={(e) =>
                  updateData((prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      history: { ...prev.home.history, achievementsSummary: e.target.value },
                    },
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB C: QUẢN LÝ THÀNH VIÊN / KHÁCH */}
      {tab === 'members' && (
        <div className="space-y-6">
          {/* Cohorts Management */}
          <div className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Quản lý Niên khóa & Liên kết nội dung ({(data.cohorts || []).length})
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tạo niên khóa để phân loại Thành viên - Khách mời / Người có liên quan và liên kết với Sự kiện, Mốc
                  son, Thông điệp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCohort(null);
                  setCohortModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                Thêm niên khóa
              </button>
            </div>

            {(data.cohorts || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
                Chưa có niên khóa nào. Nhấn &ldquo;Thêm niên khóa&rdquo; để bắt đầu phân loại.
              </div>
            ) : (
              <div className="space-y-2.5">
                {[...(data.cohorts || [])]
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((cohort, idx, arr) => {
                    const countInCohort = data.members.filter((m) => m.cohortId === cohort.id).length;
                    return (
                      <div
                        key={cohort.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#242428] p-4"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {cohort.name}
                            {cohort.period ? (
                              <span className="ml-2 text-xs font-normal text-zinc-400">({cohort.period})</span>
                            ) : null}
                            {cohort.dataOrigin === 'sample' && (
                              <span className="ml-2 text-[11px] font-normal text-[#F02028]">Mẫu</span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5">
                            {countInCohort} hồ sơ · {(cohort.linkedEventIds || []).length} sự kiện ·{' '}
                            {(cohort.linkedMilestoneIds || []).length} mốc son ·{' '}
                            {(cohort.linkedMessageIds || []).length} lời ngỏ
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              updateData((prev) => {
                                const ordered = [...(prev.cohorts || [])].sort((a, b) => a.orderIndex - b.orderIndex);
                                if (idx <= 0) return prev;
                                const [moved] = ordered.splice(idx, 1);
                                ordered.splice(idx - 1, 0, moved);
                                return { ...prev, cohorts: ordered.map((c, i) => ({ ...c, orderIndex: i })) };
                              }, 'Đã cập nhật thứ tự niên khóa.')
                            }
                            aria-label="Đưa niên khóa lên"
                            className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() =>
                              updateData((prev) => {
                                const ordered = [...(prev.cohorts || [])].sort((a, b) => a.orderIndex - b.orderIndex);
                                if (idx >= ordered.length - 1) return prev;
                                const [moved] = ordered.splice(idx, 1);
                                ordered.splice(idx + 1, 0, moved);
                                return { ...prev, cohorts: ordered.map((c, i) => ({ ...c, orderIndex: i })) };
                              }, 'Đã cập nhật thứ tự niên khóa.')
                            }
                            aria-label="Đưa niên khóa xuống"
                            className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCohort(cohort);
                              setCohortModalOpen(true);
                            }}
                            aria-label="Sửa niên khóa"
                            className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-200 hover:border-[#F02028] cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateData(
                                (prev) => ({
                                  ...prev,
                                  cohorts: (prev.cohorts || [])
                                    .filter((c) => c.id !== cohort.id)
                                    .map((c, i) => ({ ...c, orderIndex: i })),
                                  members: prev.members.map((m) =>
                                    m.cohortId === cohort.id ? { ...m, cohortId: undefined } : m
                                  ),
                                }),
                                `Đã xóa niên khóa "${cohort.name}".`
                              )
                            }
                            aria-label="Xóa niên khóa"
                            className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-200 hover:text-[#F02028] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Danh sách Hồ sơ Thành viên - Khách mời / Người có liên quan ({data.members.length})
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Thêm mới, chỉnh sửa chân dung, xếp niên khóa hoặc phân loại giữa Đoàn viên và Khách mời / Người có
                  liên quan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setMemberModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm thành viên
              </button>
            </div>

            <div className="space-y-3">
              {data.members.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#242428] p-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <ResilientImage
                        src={m.presentPhoto || m.youthPhoto}
                        alt={m.fullName}
                        downloadFileName={`${m.fullName}-chan-dung`}
                        viewerSubtitle={m.role || 'Thành viên'}
                        hideCornerButton
                        canEdit
                        onChangeImage={(nextUrl) =>
                          updateData(
                            (prev) => ({
                              ...prev,
                              members: prev.members.map((item) =>
                                item.id === m.id
                                  ? { ...item, presentPhoto: nextUrl, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                  : item
                              ),
                            }),
                            `Đã lưu ảnh chân dung cho ${m.fullName}.`
                          )
                        }
                        onDeleteImage={() =>
                          updateData(
                            (prev) => ({
                              ...prev,
                              members: prev.members.map((item) =>
                                item.id === m.id
                                  ? {
                                      ...item,
                                      ...(item.presentPhoto ? { presentPhoto: '' } : { youthPhoto: '' }),
                                      dataOrigin: 'real',
                                      updatedAt: new Date().toISOString(),
                                    }
                                  : item
                              ),
                            }),
                            `Đã xóa ảnh chân dung của ${m.fullName}.`
                          )
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">
                        {m.fullName}
                        {m.dataOrigin === 'sample' && (
                          <span className="ml-2 text-[11px] font-normal text-[#F02028]">Mẫu</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {m.role} · {m.occupation} · {m.activityPhotos.length} ảnh
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={m.cohortId || ''}
                      onChange={(e) => {
                        const nextCohortId = e.target.value || undefined;
                        updateData((prev) => {
                          const nextCohort = (prev.cohorts || []).find((c) => c.id === nextCohortId);
                          return {
                            ...prev,
                            members: prev.members.map((item) =>
                              item.id === m.id
                                ? {
                                    ...item,
                                    cohortId: nextCohortId,
                                    cohortLabel:
                                      nextCohort && (!item.cohortLabel.trim() || item.cohortLabel.trim() === 'Niên khóa')
                                        ? nextCohort.name
                                        : item.cohortLabel,
                                    dataOrigin: 'real',
                                  }
                                : item
                            ),
                          };
                        }, `Đã cập nhật niên khóa cho ${m.fullName}.`);
                      }}
                      aria-label={`Niên khóa của ${m.fullName}`}
                      className="rounded-lg border border-white/10 bg-[#171719] px-2.5 py-1.5 text-xs text-zinc-200 max-w-48"
                    >
                      <option value="">Chưa xếp niên khóa</option>
                      {[...(data.cohorts || [])]
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <select
                      value={m.group}
                      onChange={(e) =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            members: prev.members.map((item) =>
                              item.id === m.id
                                ? { ...item, group: e.target.value as MemberProfile['group'], dataOrigin: 'real' }
                                : item
                            ),
                          }),
                          `Đã cập nhật phân nhóm cho ${m.fullName}.`
                        )
                      }
                      className="rounded-lg border border-white/10 bg-[#171719] px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      <option value="member">Đoàn viên</option>
                      <option value="guest_advisor">Khách mời / Người có liên quan</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(m);
                        setMemberModalOpen(true);
                      }}
                      className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-200 hover:border-[#F02028] cursor-pointer"
                      aria-label="Sửa hồ sơ"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            members: prev.members.filter((item) => item.id !== m.id),
                          }),
                          `Đã xóa hồ sơ ${m.fullName}.`
                        )
                      }
                      className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-200 hover:text-[#F02028] cursor-pointer"
                      aria-label="Xóa hồ sơ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB D: QUẢN LÝ SỰ KIỆN */}
      {tab === 'events' && (
        <div className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Quản lý Sự kiện & Album tư liệu ({data.events.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Thêm sự kiện, upload album ảnh, video, gắn thành viên tham gia và tạo tóm tắt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setEventModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm sự kiện
            </button>
          </div>

          <div className="space-y-3">
            {data.events.map((evt) => (
              <div
                key={evt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#242428] p-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10">
                    <ResilientImage
                      src={evt.coverImage}
                      alt={evt.title}
                      downloadFileName={`su-kien-${evt.title}`}
                      viewerSubtitle={`${evt.category} · ${evt.date}`}
                      hideCornerButton
                      canEdit
                      onChangeImage={(nextUrl) =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            events: prev.events.map((item) =>
                              item.id === evt.id
                                ? { ...item, coverImage: nextUrl, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                : item
                            ),
                          }),
                          `Đã lưu ảnh bìa sự kiện "${evt.title}".`
                        )
                      }
                      onDeleteImage={() =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            events: prev.events.map((item) =>
                              item.id === evt.id
                                ? { ...item, coverImage: '', dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                : item
                            ),
                          }),
                          `Đã xóa ảnh bìa sự kiện "${evt.title}".`
                        )
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate">
                      {evt.title}
                      {evt.dataOrigin === 'sample' && (
                        <span className="ml-2 text-[11px] font-normal text-[#F02028]">Mẫu</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      <span className="font-mono-num">{evt.date}</span> · {evt.category} · {evt.photos.length} ảnh ·{' '}
                      {evt.videos.length} video
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={evt.category}
                    onChange={(e) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          events: prev.events.map((item) =>
                            item.id === evt.id
                              ? { ...item, category: e.target.value as EventCategory, dataOrigin: 'real' }
                              : item
                          ),
                        }),
                        'Đã cập nhật loại sự kiện.'
                      )
                    }
                    className="rounded-lg border border-white/10 bg-[#171719] px-2.5 py-1.5 text-xs text-zinc-200"
                  >
                    {[
                      'Phong trào',
                      'Tình nguyện',
                      'Đại hội',
                      'Kỷ niệm',
                      'Văn nghệ',
                      'Hoạt động truyền thống',
                      'Hoạt động khác',
                    ].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => saveAndPublishEvent(evt, { syncToApp: true })}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-50 cursor-pointer"
                    aria-label="Lưu và cập nhật sự kiện"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu & Cập nhật</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(evt);
                      setEventModalOpen(true);
                    }}
                    className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-200 hover:border-[#F02028] cursor-pointer"
                    aria-label="Sửa sự kiện"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          events: prev.events.filter((item) => item.id !== evt.id),
                        }),
                        `Đã xóa sự kiện "${evt.title}".`
                      )
                    }
                    className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-200 hover:text-[#F02028] cursor-pointer"
                    aria-label="Xóa sự kiện"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB E: BÀI CA & MẠNG XÃ HỘI */}
      {tab === 'anthem_social' && (
        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-xl font-semibold text-white">Quản lý Âm vang truyền thống & Hành khúc Chi đoàn</h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Tên bài ca</label>
                    <input
                      type="text"
                      value={data.home.anthem.title}
                      onChange={(e) =>
                        updateData((prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            anthem: { ...prev.home.anthem, title: e.target.value },
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Tên tác giả</label>
                    <input
                      type="text"
                      value={data.home.anthem.authorName || ''}
                      onChange={(e) =>
                        updateData((prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            anthem: { ...prev.home.anthem, authorName: e.target.value },
                          },
                        }))
                      }
                      placeholder="Tên nhạc sĩ / Đoàn viên sáng tác"
                      className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Thông tin sáng tác</label>
                  <input
                    type="text"
                    value={data.home.anthem.composerInfo}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          anthem: { ...prev.home.anthem, composerInfo: e.target.value },
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Các nội dung liên quan (hoàn cảnh ra đời, ý nghĩa...)</label>
                  <textarea
                    rows={3}
                    value={data.home.anthem.relatedInfo || ''}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          anthem: { ...prev.home.anthem, relatedInfo: e.target.value },
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Lời bài hát</label>
                  <textarea
                    rows={10}
                    value={
                      typeof data.home.anthem.lyrics === 'string'
                        ? data.home.anthem.lyrics
                        : (data.home.anthem.sections || [])
                            .map((s) => s.lyrics)
                            .filter(Boolean)
                            .join('\n\n')
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      updateData((prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          anthem: {
                            ...prev.home.anthem,
                            lyrics: val,
                            sections: [
                              {
                                id: 'anthem-lyrics',
                                partType: 'Verse',
                                label: prev.home.anthem.lyricsLabel || 'Lời bài hát',
                                lyrics: val,
                              },
                            ],
                          },
                        },
                      }));
                    }}
                    placeholder="Nhập toàn bộ lời bài hát tại đây..."
                    className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-3 h-fit">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Hình ảnh cover bài ca</span>
                  <label className="inline-flex items-center gap-1 rounded-lg bg-[#F02028] px-3 py-1 text-xs font-semibold text-white cursor-pointer">
                    <Upload className="w-3 h-3" />
                    Tải ảnh
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleAnthemImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10">
                  <ResilientImage
                    src={data.home.anthem.coverImage}
                    alt="Ảnh bài hát"
                    downloadFileName="anh-cover-bai-ca-truyen-thong"
                    viewerSubtitle="Hình ảnh cover bài ca truyền thống"
                    canEdit
                    onChangeImage={(nextUrl) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            anthem: { ...prev.home.anthem, coverImage: nextUrl },
                          },
                        }),
                        'Đã lưu ảnh cover bài ca.'
                      )
                    }
                    onDeleteImage={() =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            anthem: { ...prev.home.anthem, coverImage: '' },
                          },
                        }),
                        'Đã xóa ảnh cover bài ca.'
                      )
                    }
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Hoặc dán đường dẫn ảnh cover</label>
                  <input
                    type="text"
                    value={data.home.anthem.coverImage}
                    onChange={(e) =>
                      updateData((prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          anthem: { ...prev.home.anthem, coverImage: e.target.value },
                        },
                      }))
                    }
                    placeholder="https://... hoặc /uploads/..."
                    className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#F02028] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Multiple YouTube Links Manager */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Danh sách link YouTube bài nhạc do đoàn viên sáng tác ({(data.home.anthem.youtubeTracks || []).length})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Thêm nhiều đường dẫn YouTube để phát trực tiếp hoặc liên kết các sáng tác của đoàn viên.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  placeholder="Tên bài nhạc *"
                  className="rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                />
                <input
                  type="text"
                  value={ytAuthor}
                  onChange={(e) => setYtAuthor(e.target.value)}
                  placeholder="Tác giả (đoàn viên)"
                  className="rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                />
                <input
                  type="url"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="Link YouTube *"
                  className="rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!ytTitle.trim() || !ytUrl.trim()) {
                      notify('Vui lòng nhập tên bài nhạc và link YouTube.', 'error');
                      return;
                    }
                    const nextTrack: AnthemYoutubeTrack = {
                      id: `yt_${Date.now()}`,
                      title: ytTitle.trim(),
                      author: ytAuthor.trim() || 'Đoàn viên Chi đoàn Cù Chính Lan',
                      youtubeUrl: ytUrl.trim(),
                      notes: ytNotes.trim(),
                    };
                    updateData(
                      (prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          anthem: {
                            ...prev.home.anthem,
                            youtubeTracks: [...(prev.home.anthem.youtubeTracks || []), nextTrack],
                          },
                        },
                      }),
                      `Đã thêm bài nhạc "${nextTrack.title}".`
                    );
                    setYtTitle('');
                    setYtAuthor('');
                    setYtUrl('');
                    setYtNotes('');
                  }}
                  className="rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                >
                  + Thêm link YouTube
                </button>
              </div>

              <input
                type="text"
                value={ytNotes}
                onChange={(e) => setYtNotes(e.target.value)}
                placeholder="Ghi chú nội dung liên quan của bài nhạc (không bắt buộc)..."
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
              />

              {(data.home.anthem.youtubeTracks || []).length > 0 && (
                <div className="space-y-2">
                  {(data.home.anthem.youtubeTracks || []).map((track) => (
                    <div
                      key={track.id}
                      className="rounded-xl border border-white/10 bg-[#242428] px-4 py-3 text-xs space-y-2"
                    >
                      {editingYtId === track.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={track.title}
                              onChange={(e) =>
                                updateData((prev) => ({
                                  ...prev,
                                  home: {
                                    ...prev.home,
                                    dataOrigin: 'real',
                                    anthem: {
                                      ...prev.home.anthem,
                                      youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                        t.id === track.id ? { ...t, title: e.target.value } : t
                                      ),
                                    },
                                  },
                                }))
                              }
                              placeholder="Tên bài nhạc"
                              className="rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                            />
                            <input
                              type="text"
                              value={track.author}
                              onChange={(e) =>
                                updateData((prev) => ({
                                  ...prev,
                                  home: {
                                    ...prev.home,
                                    dataOrigin: 'real',
                                    anthem: {
                                      ...prev.home.anthem,
                                      youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                        t.id === track.id ? { ...t, author: e.target.value } : t
                                      ),
                                    },
                                  },
                                }))
                              }
                              placeholder="Tác giả"
                              className="rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                            />
                            <input
                              type="url"
                              value={track.youtubeUrl}
                              onChange={(e) =>
                                updateData((prev) => ({
                                  ...prev,
                                  home: {
                                    ...prev.home,
                                    dataOrigin: 'real',
                                    anthem: {
                                      ...prev.home.anthem,
                                      youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                        t.id === track.id ? { ...t, youtubeUrl: e.target.value } : t
                                      ),
                                    },
                                  },
                                }))
                              }
                              placeholder="Link YouTube"
                              className="rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={track.notes || ''}
                              onChange={(e) =>
                                updateData((prev) => ({
                                  ...prev,
                                  home: {
                                    ...prev.home,
                                    dataOrigin: 'real',
                                    anthem: {
                                      ...prev.home.anthem,
                                      youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                        t.id === track.id ? { ...t, notes: e.target.value } : t
                                      ),
                                    },
                                  },
                                }))
                              }
                              placeholder="Ghi chú liên quan..."
                              className="flex-1 rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingYtId(null)}
                              className="rounded-lg bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer shrink-0"
                            >
                              Xong
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {track.title} <span className="font-normal text-[#F02028]">· {track.author}</span>
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate mt-0.5">{track.youtubeUrl}</div>
                            {track.notes && <div className="text-[11px] text-zinc-300 mt-0.5">{track.notes}</div>}
                          </div>
                          <div className="flex items-center gap-1 self-start sm:self-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setEditingYtId(track.id)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                              aria-label="Sửa link YouTube"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateData(
                                  (prev) => ({
                                    ...prev,
                                    home: {
                                      ...prev.home,
                                      anthem: {
                                        ...prev.home.anthem,
                                        youtubeTracks: (prev.home.anthem.youtubeTracks || []).filter(
                                          (t) => t.id !== track.id
                                        ),
                                      },
                                    },
                                  }),
                                  'Đã xóa link YouTube.'
                                )
                              }
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-[#F02028] cursor-pointer"
                              aria-label="Xóa link YouTube"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#F02028]" />
              <h2 className="font-display text-xl font-semibold text-white">Kênh truyền thông & Mạng xã hội</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                value={newSocialPlatform}
                onChange={(e) => setNewSocialPlatform(e.target.value)}
                placeholder="Nền tảng (VD: Facebook)"
                className="rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                value={newSocialLabel}
                onChange={(e) => setNewSocialLabel(e.target.value)}
                placeholder="Tên hiển thị"
                className="rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="url"
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newSocialPlatform.trim() || !newSocialUrl.trim()) return;
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: {
                        ...prev.home,
                        socialChannels: [
                          ...prev.home.socialChannels,
                          {
                            id: `soc_${Date.now()}`,
                            platform: newSocialPlatform.trim(),
                            label: newSocialLabel.trim() || newSocialPlatform.trim(),
                            url: newSocialUrl.trim(),
                          },
                        ],
                      },
                    }),
                    'Đã thêm kênh truyền thông.'
                  );
                  setNewSocialPlatform('');
                  setNewSocialLabel('');
                  setNewSocialUrl('');
                }}
                className="rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
              >
                Thêm liên kết
              </button>
            </div>

            <div className="space-y-2">
              {data.home.socialChannels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#242428] px-4 py-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-white">{ch.platform}</span>
                    <span className="mx-2 text-zinc-500">·</span>
                    <span className="text-zinc-300">{ch.label}</span>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">{ch.url}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            socialChannels: prev.home.socialChannels.filter((item) => item.id !== ch.id),
                          },
                        }),
                        'Đã xóa liên kết truyền thông.'
                      )
                    }
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-[#F02028] cursor-pointer"
                    aria-label="Xóa liên kết"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <MemberFormModal
        isOpen={memberModalOpen}
        initialMember={editingMember}
        onClose={() => setMemberModalOpen(false)}
        onSave={(saved) =>
          updateData((prev) => {
            const exists = prev.members.some((m) => m.id === saved.id);
            return {
              ...prev,
              members: exists
                ? prev.members.map((m) => (m.id === saved.id ? saved : m))
                : [...prev.members, { ...saved, orderIndex: prev.members.length }],
            };
          }, `Đã lưu hồ sơ ${saved.fullName}.`)
        }
      />

      <CohortFormModal
        isOpen={cohortModalOpen}
        initialCohort={editingCohort}
        onClose={() => setCohortModalOpen(false)}
        onSave={(savedCohort, selectedMemberIds) =>
          updateData((prev) => {
            const prevCohorts = prev.cohorts || [];
            const exists = prevCohorts.some((c) => c.id === savedCohort.id);
            const nextCohorts = exists
              ? prevCohorts.map((c) => (c.id === savedCohort.id ? savedCohort : c))
              : [...prevCohorts, { ...savedCohort, orderIndex: prevCohorts.length }];
            const nextMembers = prev.members.map((m) => {
              const shouldBelong = selectedMemberIds.includes(m.id);
              if (shouldBelong) {
                return {
                  ...m,
                  cohortId: savedCohort.id,
                  cohortLabel:
                    !m.cohortLabel.trim() || m.cohortLabel.trim() === 'Niên khóa' ? savedCohort.name : m.cohortLabel,
                  dataOrigin: 'real' as const,
                };
              }
              if (m.cohortId === savedCohort.id && !shouldBelong) {
                return { ...m, cohortId: undefined, dataOrigin: 'real' as const };
              }
              return m;
            });
            return { ...prev, cohorts: nextCohorts, members: nextMembers };
          }, `Đã lưu niên khóa "${savedCohort.name}".`)
        }
      />

      <EventFormModal
        isOpen={eventModalOpen}
        initialEvent={editingEvent}
        onClose={() => setEventModalOpen(false)}
        onSave={(saved, options) => saveAndPublishEvent(saved, options)}
      />
    </div>
  );
}
