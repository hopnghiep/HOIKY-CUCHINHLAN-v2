import React, { useMemo, useState } from 'react';
import { Calendar, Clock, Edit3, Film, MapPin, RefreshCw, Save, Sparkles, Users, X } from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { SchoolEvent } from '../../types/memoir';
import { ResilientImage } from '../common/ResilientMedia';
import { InlineEditableText } from '../common/InlineEditableText';
import { getAdminAuthHeaders } from '../../services/authToken';

interface EventDetailModalProps {
  event: SchoolEvent | null;
  onClose: () => void;
  onEdit: (event: SchoolEvent) => void;
}

export function EventDetailModal({ event, onClose, onEdit }: EventDetailModalProps) {
  const { data, isAdmin, isSaving, aiConfigured, updateData, updateSelfMemberProfile, saveAndPublishEvent, notify } = useMemoir();
  const [selectedAlbum, setSelectedAlbum] = useState<string>('Tất cả');
  const [summarizing, setSummarizing] = useState(false);

  const albums = useMemo(() => {
    if (!event) return ['Tất cả'];
    const names = Array.from(new Set(event.photos.map((p) => p.albumName || 'Chung')));
    return ['Tất cả', ...names];
  }, [event]);

  if (!event) return null;

  const participants = data.members.filter((m) => event.participantMemberIds.includes(m.id));
  const visiblePhotos =
    selectedAlbum === 'Tất cả'
      ? event.photos
      : event.photos.filter((p) => (p.albumName || 'Chung') === selectedAlbum);

  const saveEventPatch = (patch: Partial<SchoolEvent>) =>
    saveAndPublishEvent(
      { ...event, ...patch, dataOrigin: 'real', updatedAt: new Date().toISOString() },
      { syncToApp: true }
    );

  const handleGenerateAiSummary = async () => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          title: event.title,
          category: event.category,
          date: event.date,
          location: event.location,
          intro: event.intro,
          proceedings: event.proceedings,
          results: event.results,
        }),
      });
      const json = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || !json.summary) {
        notify(json.error || 'Không thể tạo tóm tắt sự kiện.', 'error');
        return;
      }
      updateData(
        (prev) => ({
          ...prev,
          events: prev.events.map((e) =>
            e.id === event.id
              ? { ...e, summary: json.summary || e.summary, dataOrigin: 'real', updatedAt: new Date().toISOString() }
              : e
          ),
        }),
        'Đã tạo và lưu bản tóm tắt sự kiện.'
      );
    } catch {
      notify('Không thể kết nối máy chủ để tạo tóm tắt.', 'error');
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#171719] shadow-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-[#171719]/95 px-6 py-4 backdrop-blur-md">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#F02028]">
              {event.category} · <span className="font-mono-num">{event.date}</span>
              {event.dataOrigin === 'sample' ? ' · Sự kiện mẫu minh họa' : ''}
            </div>
            <InlineEditableText
              as="h2"
              value={event.title}
              canEdit={isAdmin}
              label="Tên sự kiện"
              onSave={(val) => saveEventPatch({ title: val })}
              className="truncate font-display text-xl sm:text-2xl font-semibold text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => saveAndPublishEvent(event, { syncToApp: true })}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Đang cập nhật...' : 'Lưu & Cập nhật'}</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(event)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#F02028]" />
                Sửa sự kiện
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng chi tiết sự kiện"
              className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Cover + Metadata */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 overflow-hidden rounded-2xl border border-white/10 bg-[#242428] aspect-[4/3]">
              <ResilientImage
                src={event.coverImage}
                alt={event.title}
                downloadFileName={`su-kien-${event.title}`}
                viewerSubtitle={`${event.category} · ${event.date}`}
                canEdit
                onChangeImage={(nextUrl) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      events: prev.events.map((e) =>
                        e.id === event.id
                          ? { ...e, coverImage: nextUrl, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                          : e
                      ),
                    }),
                    `Đã lưu ảnh bìa sự kiện "${event.title}".`
                  )
                }
                onDeleteImage={() =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      events: prev.events.map((e) =>
                        e.id === event.id
                          ? { ...e, coverImage: '', dataOrigin: 'real', updatedAt: new Date().toISOString() }
                          : e
                      ),
                    }),
                    `Đã xóa ảnh bìa sự kiện "${event.title}".`
                  )
                }
                className="h-full w-full object-cover"
              />
            </div>

            <div className="lg:col-span-6 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#242428] p-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-zinc-200">
                  <Calendar className="w-4 h-4 text-[#F02028]" />
                  <span>Ngày tổ chức:</span>
                  <InlineEditableText
                    as="span"
                    inline
                    value={event.date}
                    canEdit={isAdmin}
                    label="Ngày tổ chức"
                    onSave={(val) => saveEventPatch({ date: val })}
                    className="font-mono-num font-medium"
                  />
                </div>
                <div className="flex items-center gap-2 text-zinc-200">
                  <Clock className="w-4 h-4 text-[#F02028]" />
                  <span>Thời gian:</span>
                  <span className="font-mono-num">
                    {event.startTime || '--:--'} – {event.endTime || '--:--'}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-zinc-200">
                  <MapPin className="w-4 h-4 text-[#F02028] shrink-0 mt-0.5" />
                  <InlineEditableText
                    as="span"
                    value={event.location || ''}
                    emptyDisplay="Chưa cập nhật địa điểm"
                    allowEmpty
                    canEdit={isAdmin}
                    label="Địa điểm tổ chức"
                    onSave={(val) => saveEventPatch({ location: val })}
                    className="text-zinc-200"
                  />
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Tóm tắt sự kiện
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleGenerateAiSummary}
                      disabled={summarizing}
                      title={
                        aiConfigured
                          ? 'Dùng AI tạo bản tóm tắt trang trọng từ nội dung sự kiện'
                          : 'Cần cấu hình GEMINI_API_KEY để sử dụng tính năng này'
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#171719] px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F02028] disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F02028]" />
                      <span>{summarizing ? 'Đang tóm tắt...' : 'Tóm tắt bằng AI'}</span>
                    </button>
                  )}
                </div>
                <InlineEditableText
                  as="p"
                  multiline
                  collapsible
                  collapsedLines={2}
                  allowEmpty
                  value={event.summary || ''}
                  emptyDisplay="Chưa có bản tóm tắt sự kiện."
                  canEdit={isAdmin}
                  label="Tóm tắt sự kiện"
                  onSave={(val) => saveEventPatch({ summary: val })}
                  className="text-sm text-zinc-200 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Narrative Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F02028]">Nội dung giới thiệu</h3>
              <InlineEditableText
                as="p"
                multiline
                collapsible
                collapsedLines={3}
                allowEmpty
                value={event.intro || ''}
                emptyDisplay="Chưa cập nhật."
                canEdit={isAdmin}
                label="Nội dung giới thiệu"
                onSave={(val) => saveEventPatch({ intro: val })}
                className="text-sm text-zinc-300 leading-relaxed"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F02028]">Diễn biến sự kiện</h3>
              <InlineEditableText
                as="p"
                multiline
                collapsible
                collapsedLines={3}
                allowEmpty
                value={event.proceedings || ''}
                emptyDisplay="Chưa cập nhật."
                canEdit={isAdmin}
                label="Diễn biến sự kiện"
                onSave={(val) => saveEventPatch({ proceedings: val })}
                className="text-sm text-zinc-300 leading-relaxed"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F02028]">Thành tích & Kết quả</h3>
              <InlineEditableText
                as="p"
                multiline
                collapsible
                collapsedLines={3}
                allowEmpty
                value={event.results || ''}
                emptyDisplay="Chưa cập nhật."
                canEdit={isAdmin}
                label="Thành tích & Kết quả"
                onSave={(val) => saveEventPatch({ results: val })}
                className="text-sm text-zinc-300 leading-relaxed"
              />
            </div>
          </div>

          {/* Participating Members */}
          <section className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="w-4 h-4 text-[#F02028]" />
              <span>Thành viên tham gia ({participants.length})</span>
            </div>
            {participants.length === 0 ? (
              <p className="text-xs text-zinc-400">Chưa gắn thành viên tham gia sự kiện này.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#171719] p-2.5"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                      <ResilientImage
                        src={p.presentPhoto || p.youthPhoto}
                        alt={p.fullName}
                        downloadFileName={`${p.fullName}-chan-dung`}
                        viewerSubtitle={`${p.fullName} · ${p.role || 'Thành viên tham gia'}`}
                        hideCornerButton
                        canEdit
                        onChangeImage={(nextUrl) =>
                          updateSelfMemberProfile(
                            p.presentPhoto ? { ...p, presentPhoto: nextUrl } : { ...p, presentPhoto: nextUrl },
                            `Đã lưu ảnh chân dung của ${p.fullName}.`
                          )
                        }
                        onDeleteImage={() =>
                          updateSelfMemberProfile(
                            p.presentPhoto ? { ...p, presentPhoto: '' } : { ...p, youthPhoto: '' },
                            `Đã xóa ảnh chân dung của ${p.fullName}.`
                          )
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-white">{p.fullName}</div>
                      <div className="truncate text-[11px] text-zinc-400">{p.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Photo Albums */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">
                Album hình ảnh ({event.photos.length})
              </h3>
              {albums.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {albums.map((album) => (
                    <button
                      key={album}
                      type="button"
                      onClick={() => setSelectedAlbum(album)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium cursor-pointer ${
                        selectedAlbum === album
                          ? 'bg-[#F02028] text-white'
                          : 'bg-[#242428] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {album}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {visiblePhotos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
                Chưa có hình ảnh trong album này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visiblePhotos.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#242428]">
                    <div className="aspect-[4/3]">
                      <ResilientImage
                        src={photo.url}
                        alt={photo.caption || 'Ảnh tư liệu'}
                        downloadFileName={`${event.title}-${photo.caption || photo.id}`}
                        viewerSubtitle={`${event.title} · Album: ${photo.albumName || 'Chung'}`}
                        canEdit
                        onChangeImage={(nextUrl) =>
                          updateData(
                            (prev) => ({
                              ...prev,
                              events: prev.events.map((e) =>
                                e.id === event.id
                                  ? {
                                      ...e,
                                      photos: e.photos.map((item) =>
                                        item.id === photo.id ? { ...item, url: nextUrl } : item
                                      ),
                                      dataOrigin: 'real',
                                      updatedAt: new Date().toISOString(),
                                    }
                                  : e
                              ),
                            }),
                            'Đã lưu thay đổi ảnh trong album sự kiện.'
                          )
                        }
                        onDeleteImage={() =>
                          updateData(
                            (prev) => ({
                              ...prev,
                              events: prev.events.map((e) =>
                                e.id === event.id
                                  ? {
                                      ...e,
                                      photos: e.photos.filter((item) => item.id !== photo.id),
                                      dataOrigin: 'real',
                                      updatedAt: new Date().toISOString(),
                                    }
                                  : e
                              ),
                            }),
                            'Đã xóa ảnh khỏi album sự kiện.'
                          )
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <figcaption className="p-3 text-xs text-zinc-300">
                      <InlineEditableText
                        as="div"
                        value={photo.caption || ''}
                        emptyDisplay="Ảnh tư liệu"
                        allowEmpty
                        canEdit={isAdmin}
                        label="Chú thích ảnh sự kiện"
                        onSave={(val) =>
                          saveEventPatch({
                            photos: event.photos.map((item) =>
                              item.id === photo.id ? { ...item, caption: val } : item
                            ),
                          })
                        }
                        className="font-medium text-white truncate"
                      />
                      <div className="text-[11px] text-zinc-400 mt-0.5">Album: {photo.albumName || 'Chung'}</div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          {/* Videos */}
          {event.videos.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-base font-semibold text-white">
                <Film className="w-4 h-4 text-[#F02028]" />
                <span>Video tư liệu ({event.videos.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {event.videos.map((vid) => (
                  <div key={vid.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#242428] p-3 space-y-2">
                    <video controls className="w-full rounded-xl bg-black aspect-video" src={vid.url} />
                    <InlineEditableText
                      as="div"
                      value={vid.title}
                      canEdit={isAdmin}
                      label="Tiêu đề video tư liệu"
                      onSave={(val) =>
                        saveEventPatch({
                          videos: event.videos.map((item) =>
                            item.id === vid.id ? { ...item, title: val } : item
                          ),
                        })
                      }
                      className="text-xs font-medium text-white truncate"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
