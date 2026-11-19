import React, { useEffect, useState } from 'react';
import { Film, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { EventCategory, EventPhoto, EventVideo, SchoolEvent } from '../../types/memoir';
import { useMemoir } from '../../context/MemoirContext';
import { uploadOrEncodeMedia } from '../../services/indexedDb';
import { getAdminAuthHeaders } from '../../services/authToken';
import { ResilientImage } from '../common/ResilientMedia';

const EVENT_CATEGORIES: EventCategory[] = [
  'Phong trào',
  'Tình nguyện',
  'Đại hội',
  'Kỷ niệm',
  'Văn nghệ',
  'Hoạt động truyền thống',
  'Hoạt động khác',
];

interface EventFormModalProps {
  isOpen: boolean;
  initialEvent: SchoolEvent | null;
  onClose: () => void;
  onSave: (evt: SchoolEvent) => void;
}

export function EventFormModal({ isOpen, initialEvent, onClose, onSave }: EventFormModalProps) {
  const { data, aiConfigured, notify } = useMemoir();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Phong trào');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('11:30');
  const [location, setLocation] = useState('');
  const [intro, setIntro] = useState('');
  const [proceedings, setProceedings] = useState('');
  const [results, setResults] = useState('');
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [videos, setVideos] = useState<EventVideo[]>([]);
  const [participantMemberIds, setParticipantMemberIds] = useState<string[]>([]);
  const [albumNameInput, setAlbumNameInput] = useState('Album chính');
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialEvent) {
      setTitle(initialEvent.title);
      setCategory(initialEvent.category);
      setDate(initialEvent.date);
      setStartTime(initialEvent.startTime);
      setEndTime(initialEvent.endTime);
      setLocation(initialEvent.location);
      setIntro(initialEvent.intro);
      setProceedings(initialEvent.proceedings);
      setResults(initialEvent.results);
      setSummary(initialEvent.summary);
      setCoverImage(initialEvent.coverImage);
      setPhotos(initialEvent.photos);
      setVideos(initialEvent.videos);
      setParticipantMemberIds(initialEvent.participantMemberIds);
    } else {
      setTitle('');
      setCategory('Phong trào');
      setDate(new Date().toISOString().slice(0, 10));
      setStartTime('07:30');
      setEndTime('11:30');
      setLocation('Trường THPT Hoàng Hoa Thám');
      setIntro('');
      setProceedings('');
      setResults('');
      setSummary('');
      setCoverImage('');
      setPhotos([]);
      setVideos([]);
      setParticipantMemberIds([]);
    }
  }, [initialEvent, isOpen]);

  if (!isOpen) return null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadOrEncodeMedia(file, 'image');
      setCoverImage(res.url);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải ảnh bìa.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAlbumPhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const added: EventPhoto[] = [];
      for (const file of files) {
        const res = await uploadOrEncodeMedia(file, 'image');
        added.push({
          id: `ep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          caption: file.name.replace(/\.[^.]+$/, ''),
          albumName: albumNameInput.trim() || 'Album chính',
        });
      }
      setPhotos((prev) => [...prev, ...added]);
      if (!coverImage && added[0]) {
        setCoverImage(added[0].url);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải ảnh sự kiện.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const added: EventVideo[] = [];
      for (const file of files) {
        const res = await uploadOrEncodeMedia(file, 'video');
        added.push({
          id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          title: file.name.replace(/\.[^.]+$/, ''),
          mimeType: res.mimeType,
        });
      }
      setVideos((prev) => [...prev, ...added]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải video sự kiện.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAiSummarize = async () => {
    if (!title.trim()) {
      notify('Vui lòng nhập tên sự kiện trước khi tạo tóm tắt.', 'error');
      return;
    }
    setSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({ title, category, date, location, intro, proceedings, results }),
      });
      const json = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || !json.summary) {
        notify(json.error || 'Không thể tạo tóm tắt bằng AI.', 'error');
        return;
      }
      setSummary(json.summary);
      notify('Đã tạo bản tóm tắt sự kiện.', 'success');
    } catch {
      notify('Lỗi kết nối dịch vụ AI.', 'error');
    } finally {
      setSummarizing(false);
    }
  };

  const toggleParticipant = (memberId: string) => {
    setParticipantMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      notify('Vui lòng nhập tên và ngày tổ chức sự kiện.', 'error');
      return;
    }
    const nextEvent: SchoolEvent = {
      id: initialEvent?.id || `evt_${Date.now()}`,
      title: title.trim(),
      category,
      date,
      startTime,
      endTime,
      location: location.trim(),
      intro: intro.trim(),
      proceedings: proceedings.trim(),
      results: results.trim(),
      summary: summary.trim(),
      coverImage: coverImage.trim(),
      photos,
      videos,
      participantMemberIds,
      dataOrigin: 'real',
      updatedAt: new Date().toISOString(),
    };
    onSave(nextEvent);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#171719] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
          <h2 className="font-display text-xl font-semibold text-white">
            {initialEvent ? `Chỉnh sửa sự kiện: ${initialEvent.title}` : 'Thêm sự kiện mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu sự kiện"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Tên sự kiện *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Loại sự kiện</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2.5 text-white focus:border-[#F02028] focus:outline-none"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ngày tổ chức *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Bắt đầu</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Kết thúc</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Địa điểm</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nội dung giới thiệu</label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Diễn biến sự kiện</label>
              <textarea
                value={proceedings}
                onChange={(e) => setProceedings(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Thành tích hoặc kết quả</label>
              <textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-zinc-400">Tóm tắt sự kiện</label>
              <button
                type="button"
                onClick={handleAiSummarize}
                disabled={summarizing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#242428] px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F02028] disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F02028]" />
                <span>
                  {summarizing
                    ? 'Đang tạo tóm tắt...'
                    : aiConfigured
                      ? 'Tạo tóm tắt bằng AI'
                      : 'Tạo tóm tắt AI (Cần API Key)'}
                </span>
              </button>
            </div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Tóm tắt ngắn gọn kết quả và ý nghĩa sự kiện..."
              className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
            />
          </div>

          {/* Cover & Multi-photo Album */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Ảnh đại diện sự kiện</span>
                <label className="inline-flex items-center gap-1 rounded-lg bg-[#171719] border border-white/15 px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F02028] cursor-pointer">
                  <Upload className="w-3 h-3 text-[#F02028]" />
                  <span>{uploading ? 'Đang tải...' : 'Chọn ảnh'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-[#171719]">
                <ResilientImage src={coverImage} alt="Ảnh bìa sự kiện" className="h-full w-full object-cover" />
              </div>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Hoặc nhập đường dẫn ảnh..."
                className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-zinc-300 focus:border-[#F02028] focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white">Album ảnh ({photos.length}) & Video ({videos.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={albumNameInput}
                  onChange={(e) => setAlbumNameInput(e.target.value)}
                  placeholder="Tên album"
                  className="flex-1 min-w-[120px] rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                />
                <label className="inline-flex items-center gap-1 rounded-lg bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload nhiều ảnh</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAlbumPhotosUpload}
                    className="hidden"
                  />
                </label>
                <label className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#171719] px-3 py-1.5 text-xs text-zinc-200 cursor-pointer">
                  <Film className="w-3.5 h-3.5 text-[#F02028]" />
                  <span>Upload Video</span>
                  <input
                    type="file"
                    multiple
                    accept="video/mp4,video/webm"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto pt-1">
                  {photos.map((p) => (
                    <div key={p.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10">
                      <ResilientImage src={p.url} alt={p.caption} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((item) => item.id !== p.id))}
                        className="absolute top-1 right-1 rounded bg-black/75 p-1 text-white hover:bg-[#F02028] cursor-pointer"
                        aria-label="Xóa ảnh"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {videos.length > 0 && (
                <div className="space-y-1.5">
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[#171719] px-2.5 py-1.5 text-xs text-zinc-300"
                    >
                      <span className="truncate">{v.title}</span>
                      <button
                        type="button"
                        onClick={() => setVideos((prev) => prev.filter((item) => item.id !== v.id))}
                        className="text-zinc-400 hover:text-[#F02028] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tagged Members */}
          <div className="rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-2.5">
            <div className="text-xs font-medium text-white">
              Gắn thành viên tham gia ({participantMemberIds.length} đã chọn)
            </div>
            {data.members.length === 0 ? (
              <p className="text-xs text-zinc-400">Chưa có thành viên nào trong danh sách.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {data.members.map((m) => {
                  const checked = participantMemberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs cursor-pointer ${
                        checked
                          ? 'border-[#F02028] bg-[#F02028]/15 text-white'
                          : 'border-white/10 bg-[#171719] text-zinc-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleParticipant(m.id)}
                        className="accent-[#F02028]"
                      />
                      <span className="truncate">{m.fullName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#F02028] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
            >
              {initialEvent ? 'Lưu thay đổi sự kiện' : 'Tạo sự kiện mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
