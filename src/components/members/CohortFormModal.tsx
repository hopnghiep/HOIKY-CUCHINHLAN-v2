import React, { useEffect, useState } from 'react';
import { Calendar, Flag, Link2, MessageSquareQuote, Users, X } from 'lucide-react';
import type { CohortItem } from '../../types/memoir';
import { useMemoir } from '../../context/MemoirContext';

interface CohortFormModalProps {
  isOpen: boolean;
  initialCohort: CohortItem | null;
  onClose: () => void;
  onSave: (cohort: CohortItem, selectedMemberIds: string[]) => void;
}

export function CohortFormModal({ isOpen, initialCohort, onClose, onSave }: CohortFormModalProps) {
  const { data, notify } = useMemoir();

  const [name, setName] = useState('');
  const [period, setPeriod] = useState('');
  const [description, setDescription] = useState('');
  const [linkedEventIds, setLinkedEventIds] = useState<string[]>([]);
  const [linkedMilestoneIds, setLinkedMilestoneIds] = useState<string[]>([]);
  const [linkedMessageIds, setLinkedMessageIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMemberSearch('');
    if (initialCohort) {
      setName(initialCohort.name);
      setPeriod(initialCohort.period);
      setDescription(initialCohort.description);
      setLinkedEventIds(initialCohort.linkedEventIds || []);
      setLinkedMilestoneIds(initialCohort.linkedMilestoneIds || []);
      setLinkedMessageIds(initialCohort.linkedMessageIds || []);
      setSelectedMemberIds(
        data.members.filter((m) => m.cohortId === initialCohort.id).map((m) => m.id)
      );
    } else {
      setName('');
      setPeriod('');
      setDescription('');
      setLinkedEventIds([]);
      setLinkedMilestoneIds([]);
      setLinkedMessageIds([]);
      setSelectedMemberIds([]);
    }
  }, [data.members, initialCohort, isOpen]);

  if (!isOpen) return null;

  const toggleId = (list: string[], id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      notify('Vui lòng nhập tên niên khóa.', 'error');
      return;
    }

    const nextCohort: CohortItem = {
      id: initialCohort?.id || `cohort_${Date.now()}`,
      name: name.trim(),
      period: period.trim(),
      description: description.trim(),
      linkedEventIds,
      linkedMilestoneIds,
      linkedMessageIds,
      orderIndex: initialCohort?.orderIndex ?? (data.cohorts?.length || 0),
      dataOrigin: 'real',
    };

    onSave(nextCohort, selectedMemberIds);
    onClose();
  };

  const filteredMembers = data.members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.cohortLabel.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#171719] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
          <div>
            <div className="text-xs font-medium text-[#F02028]">
              Quản lý Niên khóa & Liên kết nội dung Hồi ký
            </div>
            <h2 className="font-display text-xl font-semibold text-white">
              {initialCohort ? `Chỉnh sửa: ${initialCohort.name}` : 'Thêm niên khóa mới'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu niên khóa"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Tên niên khóa *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="VD: Niên khóa 1998–2001"
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Giai đoạn / Thời gian</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="VD: 1998 - 2001 hoặc Nhiệm kỳ 2010–2011"
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Mô tả dấu ấn niên khóa</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tóm tắt đặc trưng thế hệ, kỷ niệm tiêu biểu hoặc vai trò đồng hành..."
              className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
            />
          </div>

          {/* Link with other memoir content */}
          <div className="space-y-4 rounded-2xl border border-white/10 bg-[#242428] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Link2 className="w-4 h-4 text-[#F02028]" />
              <span>Liên kết niên khóa với các nội dung khác</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Linked Events */}
              <div className="rounded-xl border border-white/10 bg-[#171719] p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Calendar className="w-3.5 h-3.5 text-[#F02028]" />
                  <span>Sự kiện ({linkedEventIds.length})</span>
                </div>
                {data.events.length === 0 ? (
                  <p className="text-xs text-zinc-500">Chưa có sự kiện nào.</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {data.events.map((evt) => (
                      <label
                        key={evt.id}
                        className="flex items-start gap-2 rounded-lg p-1.5 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={linkedEventIds.includes(evt.id)}
                          onChange={() => toggleId(linkedEventIds, evt.id, setLinkedEventIds)}
                          className="mt-0.5 accent-[#F02028]"
                        />
                        <span className="leading-snug">
                          {evt.title}
                          <span className="block font-mono-num text-[11px] text-zinc-500">{evt.date}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Milestones */}
              <div className="rounded-xl border border-white/10 bg-[#171719] p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Flag className="w-3.5 h-3.5 text-[#F02028]" />
                  <span>Mốc son lịch sử ({linkedMilestoneIds.length})</span>
                </div>
                {data.milestones.length === 0 ? (
                  <p className="text-xs text-zinc-500">Chưa có mốc son nào.</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {data.milestones.map((ms) => (
                      <label
                        key={ms.id}
                        className="flex items-start gap-2 rounded-lg p-1.5 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={linkedMilestoneIds.includes(ms.id)}
                          onChange={() => toggleId(linkedMilestoneIds, ms.id, setLinkedMilestoneIds)}
                          className="mt-0.5 accent-[#F02028]"
                        />
                        <span className="leading-snug">
                          {ms.title}
                          <span className="block text-[11px] text-zinc-500">{ms.year}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Leader Messages */}
              <div className="rounded-xl border border-white/10 bg-[#171719] p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-[#F02028]" />
                  <span>Thông điệp / Lời ngỏ ({linkedMessageIds.length})</span>
                </div>
                {data.leaderMessages.length === 0 ? (
                  <p className="text-xs text-zinc-500">Chưa có thông điệp nào.</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {data.leaderMessages.map((msg) => (
                      <label
                        key={msg.id}
                        className="flex items-start gap-2 rounded-lg p-1.5 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={linkedMessageIds.includes(msg.id)}
                          onChange={() => toggleId(linkedMessageIds, msg.id, setLinkedMessageIds)}
                          className="mt-0.5 accent-[#F02028]"
                        />
                        <span className="leading-snug">
                          {msg.title}
                          <span className="block text-[11px] text-zinc-500">{msg.authorName}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Link Members / Guests to this Cohort */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-[#242428] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
                <Users className="w-4 h-4 text-[#F02028]" />
                <span>
                  Thành viên - Khách mời / Người có liên quan thuộc niên khóa ({selectedMemberIds.length})
                </span>
              </div>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Lọc nhanh tên..."
                className="rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none sm:w-52"
              />
            </div>

            {data.members.length === 0 ? (
              <p className="text-xs text-zinc-500">Chưa có hồ sơ thành viên nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {filteredMembers.map((m) => {
                  const checked = selectedMemberIds.includes(m.id);
                  const otherCohort =
                    m.cohortId && m.cohortId !== initialCohort?.id
                      ? (data.cohorts || []).find((c) => c.id === m.cohortId)?.name
                      : null;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'border-[#F02028]/60 bg-[#F02028]/10 text-white'
                          : 'border-white/10 bg-[#171719] text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleId(selectedMemberIds, m.id, setSelectedMemberIds)}
                        className="mt-0.5 accent-[#F02028]"
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{m.fullName}</div>
                        <div className="text-[11px] text-zinc-400 truncate">
                          {m.group === 'member' ? 'Đoàn viên' : 'Khách mời / Người có liên quan'}
                          {m.role ? ` · ${m.role}` : ''}
                        </div>
                        {otherCohort && !checked && (
                          <div className="text-[11px] text-amber-300/90 truncate">
                            Hiện đang ở: {otherCohort}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
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
              {initialCohort ? 'Lưu thay đổi niên khóa' : 'Tạo niên khóa & Liên kết'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
