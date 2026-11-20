import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  List,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { EventCategory, SchoolEvent } from '../../types/memoir';
import { ResilientImage } from '../common/ResilientMedia';
import { InlineEditableText } from '../common/InlineEditableText';
import { EventDetailModal } from './EventDetailModal';
import { EventFormModal } from './EventFormModal';

const CATEGORIES: ('Tất cả' | EventCategory)[] = [
  'Tất cả',
  'Phong trào',
  'Tình nguyện',
  'Đại hội',
  'Kỷ niệm',
  'Văn nghệ',
  'Hoạt động truyền thống',
  'Hoạt động khác',
];

export function EventsView() {
  const { data, isAdmin, isSaving, updateData, saveAndPublishEvent } = useMemoir();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [categoryFilter, setCategoryFilter] = useState<'Tất cả' | EventCategory>('Tất cả');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const initialCalDate = useMemo(() => {
    if (data.events.length > 0 && data.events[0].date) {
      const [y, m] = data.events[0].date.split('-').map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date(2026, 10, 1);
  }, [data.events]);

  const [calendarMonth, setCalendarMonth] = useState<Date>(initialCalDate);

  const selectedEvent = useMemo(
    () => data.events.find((e) => e.id === selectedEventId) || null,
    [data.events, selectedEventId]
  );

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.events.filter((e) => {
      if (categoryFilter !== 'Tất cả' && e.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.intro.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q)
      );
    });
    return [...list].sort((a, b) =>
      sortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );
  }, [categoryFilter, data.events, search, sortOrder]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { day: number | null; dateStr: string | null; events: SchoolEvent[] }[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: null, dateStr: null, events: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter((e) => e.date === dateStr);
      cells.push({ day: d, dateStr, events: dayEvents });
    }
    return cells;
  }, [calendarMonth, filteredEvents]);

  const handleSaveEvent = (saved: SchoolEvent, options?: { syncToApp?: boolean }) => {
    return saveAndPublishEvent(saved, options);
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <section className="corp-hero-sheet editorial-open-section rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-medium tracking-[0.08em] uppercase text-zinc-400">
              Biên niên hoạt động · <span className="font-mono-num">{data.events.length}</span> sự kiện lưu trữ
            </div>
            <h1 className="mt-2 font-display editorial-section-title text-2xl sm:text-4xl font-semibold text-white">
              Sự kiện & Hoạt động Chi đoàn
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-xl border border-white/10 bg-[#242428] p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#F02028] text-white' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Danh sách
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  viewMode === 'calendar' ? 'bg-[#F02028] text-white' : 'text-zinc-300 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Lịch tháng
              </button>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setEditingEvent(null);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm sự kiện</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs + Search + Time Sort */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#F02028] text-white'
                    : 'bg-[#242428] text-zinc-300 hover:text-white border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm sự kiện..."
                className="w-full rounded-xl border border-white/10 bg-[#242428] pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
              />
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              aria-label="Sắp xếp thời gian sự kiện"
              className="rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
            >
              <option value="desc">Mới nhất trước</option>
              <option value="asc">Cũ nhất trước</option>
            </select>
          </div>
        </div>
      </section>

      {/* Content View: List or Calendar */}
      {viewMode === 'list' ? (
        filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-[#171719] p-12 text-center text-sm text-zinc-400">
            Không có sự kiện nào phù hợp với tiêu chí tìm kiếm.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-7">
            {filteredEvents.map((evt, evtIdx) => {
              const isEditorialLead = evtIdx === 0 && filteredEvents.length >= 2;
              return (
                <article
                  key={evt.id}
                  className={`editorial-cream-sheet overflow-hidden rounded-3xl border border-white/10 bg-[#242428] flex flex-col justify-between transition-colors hover:border-white/25 ${
                    isEditorialLead ? 'md:col-span-2 xl:col-span-2' : ''
                  }`}
                >
                  <div>
                    <div
                      className={`editorial-photo-frame relative bg-[#171719] ${
                        isEditorialLead ? 'aspect-[16/9] sm:aspect-[21/10]' : 'aspect-[16/10]'
                      }`}
                    >
                    <ResilientImage
                      src={evt.coverImage}
                      alt={evt.title}
                      downloadFileName={`su-kien-${evt.title}`}
                      viewerSubtitle={`${evt.category} · ${evt.date}`}
                      canEdit
                      onChangeImage={(nextUrl) =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            events: prev.events.map((e) =>
                              e.id === evt.id
                                ? { ...e, coverImage: nextUrl, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                : e
                            ),
                          }),
                          `Đã lưu ảnh bìa sự kiện "${evt.title}".`
                        )
                      }
                      onDeleteImage={() =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            events: prev.events.map((e) =>
                              e.id === evt.id
                                ? { ...e, coverImage: '', dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                : e
                            ),
                          }),
                          `Đã xóa ảnh bìa sự kiện "${evt.title}".`
                        )
                      }
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-medium text-[#F02028]">{evt.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num">{evt.date}</span>
                        {evt.dataOrigin === 'sample' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Mẫu</span>
                          </>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEvent(evt);
                              setFormOpen(true);
                            }}
                            aria-label={`Sửa ${evt.title}`}
                            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateData(
                                (prev) => ({
                                  ...prev,
                                  events: prev.events.filter((e) => e.id !== evt.id),
                                }),
                                `Đã xóa sự kiện "${evt.title}".`
                              )
                            }
                            aria-label={`Xóa ${evt.title}`}
                            className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <InlineEditableText
                      as="h2"
                      value={evt.title}
                      canEdit={isAdmin}
                      stopPropagation
                      label="Tên sự kiện"
                      onSave={(val) =>
                        saveAndPublishEvent({ ...evt, title: val }, { syncToApp: true })
                      }
                      className="font-display text-xl font-semibold text-white line-clamp-2"
                    />

                    <div className="space-y-1 text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-mono-num">
                          {evt.startTime} – {evt.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <InlineEditableText
                            as="span"
                            value={evt.location || ''}
                            emptyDisplay="Chưa cập nhật địa điểm"
                            allowEmpty
                            canEdit={isAdmin}
                            stopPropagation
                            label="Địa điểm tổ chức"
                            onSave={(val) =>
                              saveAndPublishEvent({ ...evt, location: val }, { syncToApp: true })
                            }
                            className="block truncate text-xs text-zinc-400"
                          />
                        </div>
                      </div>
                    </div>

                    <InlineEditableText
                      as="p"
                      multiline
                      collapsible
                      collapsedLines={2}
                      allowEmpty
                      stopPropagation
                      value={evt.summary || evt.intro || ''}
                      emptyDisplay="Chưa có mô tả sự kiện."
                      canEdit={isAdmin}
                      label={evt.summary ? 'Tóm tắt sự kiện' : 'Nội dung giới thiệu sự kiện'}
                      onSave={(val) =>
                        saveAndPublishEvent(
                          evt.summary ? { ...evt, summary: val } : { ...evt, intro: val },
                          { syncToApp: true }
                        )
                      }
                      className="text-xs text-zinc-300 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span className="font-mono-num">
                    {evt.photos.length} ảnh · {evt.participantMemberIds.length} thành viên
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveAndPublishEvent(evt, { syncToApp: true })}
                      disabled={isSaving}
                      title="Lưu và cập nhật nội dung sự kiện này"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#171719] px-3 py-2 text-xs font-medium text-white hover:border-[#F02028] hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-[#F02028]" />
                      <span>Lưu & Cập nhật</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(evt.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem chi tiết
                    </button>
                  </div>
                </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* Calendar Mode */
        <section className="rounded-3xl border border-white/10 bg-[#171719] p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-white">
              Tháng {calendarMonth.getMonth() + 1} / {calendarMonth.getFullYear()}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
                aria-label="Tháng trước"
                className="rounded-xl border border-white/10 bg-[#242428] p-2 text-zinc-200 hover:bg-white/10 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
                aria-label="Tháng sau"
                className="rounded-xl border border-white/10 bg-[#242428] p-2 text-zinc-200 hover:bg-white/10 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-zinc-400">
            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map((d) => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, idx) => (
              <div
                key={idx}
                className={`min-h-[96px] rounded-xl border p-2 ${
                  cell.day
                    ? 'border-white/10 bg-[#242428]'
                    : 'border-transparent bg-transparent'
                }`}
              >
                {cell.day && (
                  <>
                    <div className="font-mono-num text-xs text-zinc-400 mb-1.5">{cell.day}</div>
                    <div className="space-y-1">
                      {cell.events.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelectedEventId(ev.id)}
                          className="w-full text-left rounded-lg bg-[#F02028]/20 border border-[#F02028]/40 px-2 py-1 text-[11px] font-medium text-white hover:bg-[#F02028]/35 truncate cursor-pointer"
                        >
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onEdit={(evt) => {
          setSelectedEventId(null);
          setEditingEvent(evt);
          setFormOpen(true);
        }}
      />

      <EventFormModal
        isOpen={formOpen}
        initialEvent={editingEvent}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
