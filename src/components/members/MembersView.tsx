import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  Edit3,
  Eye,
  Flag,
  FolderPlus,
  Globe,
  GripVertical,
  Layers,
  Mail,
  MessageSquareQuote,
  Phone,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { CohortItem, MemberGroup, MemberProfile, SchoolEvent } from '../../types/memoir';
import { ResilientImage } from '../common/ResilientMedia';
import { InlineEditableText } from '../common/InlineEditableText';
import { MemberDetailModal } from './MemberDetailModal';
import { MemberFormModal } from './MemberFormModal';
import { CohortFormModal } from './CohortFormModal';
import { EventDetailModal } from '../events/EventDetailModal';
import { EventFormModal } from '../events/EventFormModal';

type SortOption = 'manual' | 'az' | 'za' | 'role' | 'joinDate';
type MemberViewMode = 'by_cohort' | 'flat';

const UNASSIGNED_COHORT_KEY = '__unassigned__';

export function MembersView({ initialGroup = 'member' }: { initialGroup?: MemberGroup }) {
  const {
    data,
    isAdmin,
    isSignedIn,
    currentUser,
    setActiveTab,
    canEditMember,
    updateData,
    updateSelfMemberProfile,
    createOwnMemberProfile,
    saveAndPublishEvent,
  } = useMemoir();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | MemberGroup>(initialGroup);

  useEffect(() => {
    setGroupFilter(initialGroup);
  }, [initialGroup]);
  const [viewMode, setViewMode] = useState<MemberViewMode>('by_cohort');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('manual');

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);
  const [defaultCohortForNewMember, setDefaultCohortForNewMember] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const [cohortModalOpen, setCohortModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<CohortItem | null>(null);

  const [selectedLinkedEventId, setSelectedLinkedEventId] = useState<string | null>(null);
  const [editingLinkedEvent, setEditingLinkedEvent] = useState<SchoolEvent | null>(null);
  const [linkedEventFormOpen, setLinkedEventFormOpen] = useState(false);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCohortKey, setDragOverCohortKey] = useState<string | null>(null);

  const cohorts = useMemo(
    () => [...(data.cohorts || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [data.cohorts]
  );

  const cohortMap = useMemo(() => {
    const map = new Map<string, CohortItem>();
    for (const c of cohorts) map.set(c.id, c);
    return map;
  }, [cohorts]);

  const selectedMember = useMemo(
    () => data.members.find((m) => m.id === selectedMemberId) || null,
    [data.members, selectedMemberId]
  );

  const selectedLinkedEvent = useMemo(
    () => data.events.find((e) => e.id === selectedLinkedEventId) || null,
    [data.events, selectedLinkedEventId]
  );

  const sortMembersList = (list: MemberProfile[]) => {
    const sorted = [...list];
    switch (sortBy) {
      case 'az':
        sorted.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
        break;
      case 'za':
        sorted.sort((a, b) => b.fullName.localeCompare(a.fullName, 'vi'));
        break;
      case 'role':
        sorted.sort((a, b) => a.role.localeCompare(b.role, 'vi'));
        break;
      case 'joinDate':
        sorted.sort((a, b) => (a.joinDate || '').localeCompare(b.joinDate || ''));
        break;
      case 'manual':
      default:
        sorted.sort((a, b) => a.orderIndex - b.orderIndex);
        break;
    }
    return sorted;
  };

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.members.filter((m) => {
      if (groupFilter !== 'all' && m.group !== groupFilter) return false;
      const resolvedCohortId = m.cohortId && cohortMap.has(m.cohortId) ? m.cohortId : UNASSIGNED_COHORT_KEY;
      if (cohortFilter !== 'all' && resolvedCohortId !== cohortFilter) return false;
      if (!q) return true;
      const cohortName = m.cohortId ? cohortMap.get(m.cohortId)?.name || '' : '';
      return (
        m.fullName.toLowerCase().includes(q) ||
        m.occupation.toLowerCase().includes(q) ||
        m.field.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.cohortLabel.toLowerCase().includes(q) ||
        cohortName.toLowerCase().includes(q)
      );
    });

    return sortMembersList(list);
  }, [cohortFilter, cohortMap, data.members, groupFilter, search, sortBy]);

  const cohortSections = useMemo(() => {
    const visibleCohorts =
      cohortFilter === 'all'
        ? cohorts
        : cohorts.filter((c) => c.id === cohortFilter);

    const sections: {
      key: string;
      cohort: CohortItem | null;
      members: MemberProfile[];
    }[] = visibleCohorts.map((c) => ({
      key: c.id,
      cohort: c,
      members: filteredMembers.filter((m) => m.cohortId === c.id),
    }));

    const unassignedMembers = filteredMembers.filter(
      (m) => !m.cohortId || !cohortMap.has(m.cohortId)
    );

    if (
      cohortFilter === UNASSIGNED_COHORT_KEY ||
      (cohortFilter === 'all' && (unassignedMembers.length > 0 || cohorts.length === 0))
    ) {
      sections.push({
        key: UNASSIGNED_COHORT_KEY,
        cohort: null,
        members: unassignedMembers,
      });
    }

    // Hide empty cohorts only if user has active text search or group filter (unless admin wants drop targets in manual mode)
    if (search.trim() || groupFilter !== 'all') {
      return sections.filter((s) => s.members.length > 0 || (isAdmin && sortBy === 'manual' && s.cohort !== null));
    }
    return sections;
  }, [cohortFilter, cohortMap, cohorts, filteredMembers, groupFilter, isAdmin, search, sortBy]);

  const memberCount = data.members.filter((m) => m.group === 'member').length;
  const guestCount = data.members.filter((m) => m.group === 'guest_advisor').length;

  const handleSaveMember = async (saved: MemberProfile, publishImmediately = false) => {
    if (isAdmin) {
      updateData((prev) => {
        const exists = prev.members.some((m) => m.id === saved.id);
        if (exists) {
          return {
            ...prev,
            members: prev.members.map((m) => (m.id === saved.id ? saved : m)),
          };
        }
        return {
          ...prev,
          members: [...prev.members, { ...saved, orderIndex: prev.members.length }],
        };
      }, `Đã lưu hồ sơ ${saved.fullName}.`);
      return;
    }

    const exists = data.members.some((m) => m.id === saved.id);
    if (!exists) {
      const ok = await createOwnMemberProfile(saved);
      if (ok) {
        setSelectedMemberId(saved.id);
      }
      return;
    }

    updateSelfMemberProfile(
      saved,
      `Đã lưu và cập nhật hồ sơ ${saved.fullName}.`
    );
    if (!publishImmediately) {
      setSelectedMemberId(saved.id);
    }
  };

  const handleSaveCohort = (savedCohort: CohortItem, selectedMemberIds: string[]) => {
    updateData((prev) => {
      const prevCohorts = prev.cohorts || [];
      const exists = prevCohorts.some((c) => c.id === savedCohort.id);
      const nextCohorts = exists
        ? prevCohorts.map((c) => (c.id === savedCohort.id ? savedCohort : c))
        : [...prevCohorts, { ...savedCohort, orderIndex: prevCohorts.length }];

      const nextMembers = prev.members.map((m) => {
        const shouldBelong = selectedMemberIds.includes(m.id);
        if (shouldBelong) {
          const prevCohortName = prevCohorts.find((c) => c.id === m.cohortId)?.name;
          const shouldSyncLabel =
            !m.cohortLabel.trim() ||
            m.cohortLabel.trim() === 'Niên khóa' ||
            (prevCohortName && m.cohortLabel.trim() === prevCohortName);
          return {
            ...m,
            cohortId: savedCohort.id,
            cohortLabel: shouldSyncLabel ? savedCohort.name : m.cohortLabel,
            dataOrigin: 'real' as const,
          };
        }
        if (m.cohortId === savedCohort.id && !shouldBelong) {
          return {
            ...m,
            cohortId: undefined,
            dataOrigin: 'real' as const,
          };
        }
        return m;
      });

      return {
        ...prev,
        cohorts: nextCohorts,
        members: nextMembers,
      };
    }, `Đã lưu niên khóa "${savedCohort.name}" và cập nhật liên kết.`);
  };

  const handleDeleteCohort = (cohort: CohortItem) => {
    updateData(
      (prev) => ({
        ...prev,
        cohorts: (prev.cohorts || [])
          .filter((c) => c.id !== cohort.id)
          .map((c, idx) => ({ ...c, orderIndex: idx })),
        members: prev.members.map((m) => (m.cohortId === cohort.id ? { ...m, cohortId: undefined } : m)),
      }),
      `Đã xóa niên khóa "${cohort.name}". Hồ sơ thành viên được giữ lại ở nhóm chưa phân loại.`
    );
    if (cohortFilter === cohort.id) {
      setCohortFilter('all');
    }
  };

  const handleMoveCohort = (cohortId: string, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    updateData((prev) => {
      const ordered = [...(prev.cohorts || [])].sort((a, b) => a.orderIndex - b.orderIndex);
      const idx = ordered.findIndex((c) => c.id === cohortId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= ordered.length) return prev;
      const [moved] = ordered.splice(idx, 1);
      ordered.splice(targetIdx, 0, moved);
      return {
        ...prev,
        cohorts: ordered.map((c, i) => ({ ...c, orderIndex: i })),
      };
    }, 'Đã cập nhật thứ tự các niên khóa.');
  };

  const handleDropReorderOnCard = (targetId: string) => {
    if (!isAdmin || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverCohortKey(null);
      return;
    }
    updateData((prev) => {
      const ordered = [...prev.members].sort((a, b) => a.orderIndex - b.orderIndex);
      const fromIndex = ordered.findIndex((m) => m.id === draggedId);
      const toIndex = ordered.findIndex((m) => m.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const targetMember = ordered[toIndex];
      const [moved] = ordered.splice(fromIndex, 1);

      const oldCohort = (prev.cohorts || []).find((c) => c.id === moved.cohortId);
      const nextCohort = (prev.cohorts || []).find((c) => c.id === targetMember.cohortId);
      const nextCohortId = targetMember.cohortId;
      const shouldUpdateLabel =
        moved.cohortId !== nextCohortId &&
        nextCohort &&
        (!moved.cohortLabel.trim() ||
          moved.cohortLabel.trim() === 'Niên khóa' ||
          (oldCohort && moved.cohortLabel.trim() === oldCohort.name));

      const updatedMoved: MemberProfile = {
        ...moved,
        cohortId: nextCohortId,
        cohortLabel: shouldUpdateLabel && nextCohort ? nextCohort.name : moved.cohortLabel,
      };

      const insertIndex = ordered.findIndex((m) => m.id === targetId);
      ordered.splice(insertIndex === -1 ? toIndex : insertIndex, 0, updatedMoved);
      return {
        ...prev,
        members: ordered.map((m, idx) => ({ ...m, orderIndex: idx })),
      };
    }, 'Đã cập nhật thứ tự sắp xếp thành viên.');
    setDraggedId(null);
    setDragOverCohortKey(null);
  };

  const handleDropOnCohortSection = (targetCohortKey: string) => {
    if (!isAdmin || !draggedId) {
      setDraggedId(null);
      setDragOverCohortKey(null);
      return;
    }
    const nextCohortId = targetCohortKey === UNASSIGNED_COHORT_KEY ? undefined : targetCohortKey;
    updateData((prev) => {
      const ordered = [...prev.members].sort((a, b) => a.orderIndex - b.orderIndex);
      const fromIndex = ordered.findIndex((m) => m.id === draggedId);
      if (fromIndex === -1) return prev;
      const [moved] = ordered.splice(fromIndex, 1);
      const oldCohort = (prev.cohorts || []).find((c) => c.id === moved.cohortId);
      const nextCohort = (prev.cohorts || []).find((c) => c.id === nextCohortId);
      const shouldUpdateLabel =
        moved.cohortId !== nextCohortId &&
        nextCohort &&
        (!moved.cohortLabel.trim() ||
          moved.cohortLabel.trim() === 'Niên khóa' ||
          (oldCohort && moved.cohortLabel.trim() === oldCohort.name));

      const updatedMoved: MemberProfile = {
        ...moved,
        cohortId: nextCohortId,
        cohortLabel: shouldUpdateLabel && nextCohort ? nextCohort.name : moved.cohortLabel,
      };
      ordered.push(updatedMoved);
      return {
        ...prev,
        members: ordered.map((m, idx) => ({ ...m, orderIndex: idx })),
      };
    }, 'Đã chuyển thành viên sang niên khóa mới.');
    setDraggedId(null);
    setDragOverCohortKey(null);
  };

  const handleMoveMemberWithinScope = (memberId: string, scopeIds: string[], direction: 'prev' | 'next') => {
    if (!isAdmin) return;
    const pos = scopeIds.indexOf(memberId);
    if (pos === -1) return;
    const targetPos = direction === 'prev' ? pos - 1 : pos + 1;
    if (targetPos < 0 || targetPos >= scopeIds.length) return;
    const swapTargetId = scopeIds[targetPos];

    updateData((prev) => {
      const ordered = [...prev.members].sort((a, b) => a.orderIndex - b.orderIndex);
      const idxA = ordered.findIndex((m) => m.id === memberId);
      const idxB = ordered.findIndex((m) => m.id === swapTargetId);
      if (idxA === -1 || idxB === -1) return prev;
      const temp = ordered[idxA];
      ordered[idxA] = ordered[idxB];
      ordered[idxB] = temp;
      return {
        ...prev,
        members: ordered.map((m, i) => ({ ...m, orderIndex: i })),
      };
    }, 'Đã điều chỉnh thứ tự thủ công.');
  };

  const handleAssignMemberCohort = (memberId: string, nextCohortIdRaw: string) => {
    if (!isAdmin) return;
    const nextCohortId = nextCohortIdRaw || undefined;
    updateData((prev) => {
      const oldCohorts = prev.cohorts || [];
      const nextCohort = oldCohorts.find((c) => c.id === nextCohortId);
      return {
        ...prev,
        members: prev.members.map((m) => {
          if (m.id !== memberId) return m;
          const oldCohort = oldCohorts.find((c) => c.id === m.cohortId);
          const shouldUpdateLabel =
            nextCohort &&
            (!m.cohortLabel.trim() ||
              m.cohortLabel.trim() === 'Niên khóa' ||
              (oldCohort && m.cohortLabel.trim() === oldCohort.name));
          return {
            ...m,
            cohortId: nextCohortId,
            cohortLabel: shouldUpdateLabel && nextCohort ? nextCohort.name : m.cohortLabel,
          };
        }),
      };
    }, 'Đã chuyển niên khóa cho hồ sơ.');
  };

  const renderMemberCard = (member: MemberProfile, scopeIds: string[], indexInScope: number) => {
    const memberCohort = member.cohortId ? cohortMap.get(member.cohortId) : undefined;
    return (
      <article
        key={member.id}
        draggable={isAdmin && sortBy === 'manual'}
        onDragStart={(e) => {
          e.stopPropagation();
          setDraggedId(member.id);
        }}
        onDragOver={(e) => {
          if (isAdmin && sortBy === 'manual') {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDrop={(e) => {
          e.stopPropagation();
          handleDropReorderOnCard(member.id);
        }}
        onDragEnd={() => {
          setDraggedId(null);
          setDragOverCohortKey(null);
        }}
        className={`rounded-3xl border bg-[#242428] p-5 flex flex-col justify-between gap-5 transition-colors hover:border-white/25 ${
          draggedId === member.id ? 'border-[#F02028] opacity-70' : 'border-white/10'
        }`}
      >
        <div className="space-y-4">
          {/* Quiet Unboxed Top Metadata */}
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 min-w-0">
              {isAdmin && sortBy === 'manual' && (
                <GripVertical className="w-3.5 h-3.5 text-zinc-500 cursor-grab shrink-0" />
              )}
              <span className="text-zinc-300 font-medium truncate">
                {member.group === 'member' ? 'Đoàn viên' : 'Khách mời / Người có liên quan'}
              </span>
              {memberCohort && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-zinc-400 truncate">{memberCohort.name}</span>
                </>
              )}
              {member.dataOrigin === 'sample' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F02028] shrink-0">Mẫu</span>
                </>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                {sortBy === 'manual' && scopeIds.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={indexInScope === 0}
                      onClick={() => handleMoveMemberWithinScope(member.id, scopeIds, 'prev')}
                      aria-label={`Đưa ${member.fullName} lên trước`}
                      title="Đưa lên trước"
                      className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={indexInScope === scopeIds.length - 1}
                      onClick={() => handleMoveMemberWithinScope(member.id, scopeIds, 'next')}
                      aria-label={`Đưa ${member.fullName} xuống sau`}
                      title="Đưa xuống sau"
                      className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingMember(member);
                    setDefaultCohortForNewMember(undefined);
                    setFormOpen(true);
                  }}
                  aria-label={`Sửa ${member.fullName}`}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updateData(
                      (prev) => ({
                        ...prev,
                        members: prev.members.filter((m) => m.id !== member.id),
                      }),
                      `Đã xóa hồ sơ ${member.fullName}.`
                    )
                  }
                  aria-label={`Xóa ${member.fullName}`}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Admin manual cross-cohort move select */}
          {isAdmin && sortBy === 'manual' && cohorts.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-xs">
              <span className="text-zinc-400 shrink-0">Chuyển niên khóa:</span>
              <select
                value={memberCohort ? memberCohort.id : ''}
                onChange={(e) => handleAssignMemberCohort(member.id, e.target.value)}
                aria-label={`Chuyển niên khóa cho ${member.fullName}`}
                className="min-w-0 flex-1 bg-transparent text-right text-xs font-medium text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#171719]">
                  Chưa phân loại niên khóa
                </option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#171719]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Side-by-Side Past vs Present Portraits */}
          <div className="rounded-2xl border border-white/10 bg-[#171719] p-3">
            <div className="grid grid-cols-11 items-center gap-2">
              <div className="col-span-5 space-y-1.5">
                <div className="editorial-photo-frame aspect-square overflow-hidden rounded-xl bg-[#242428]">
                  <ResilientImage
                    src={member.youthPhoto}
                    alt={`${member.fullName} thời trẻ`}
                    downloadFileName={`${member.fullName}-thoi-tre`}
                    viewerSubtitle={`${member.fullName} · ${member.cohortLabel || 'Thời trẻ'}`}
                    canEdit
                    onChangeImage={(nextUrl) =>
                      updateSelfMemberProfile(
                        { ...member, youthPhoto: nextUrl },
                        `Đã lưu ảnh thời trẻ của ${member.fullName}.`
                      )
                    }
                    onDeleteImage={() =>
                      updateSelfMemberProfile(
                        { ...member, youthPhoto: '' },
                        `Đã xóa ảnh thời trẻ của ${member.fullName}.`
                      )
                    }
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-center text-[11px] text-zinc-400 truncate">
                  {member.cohortLabel || 'Niên khóa'}
                </div>
              </div>

              <div className="col-span-1 flex justify-center">
                <ArrowRight className="w-4 h-4 text-[#F02028]" />
              </div>

              <div className="col-span-5 space-y-1.5">
                <div className="editorial-photo-frame aspect-square overflow-hidden rounded-xl bg-[#242428] ring-1 ring-white/10">
                  <ResilientImage
                    src={member.presentPhoto}
                    alt={`${member.fullName} hiện tại`}
                    downloadFileName={`${member.fullName}-hien-tai`}
                    viewerSubtitle={`${member.fullName} · ${member.presentLabel || 'Hiện tại'}`}
                    canEdit
                    onChangeImage={(nextUrl) =>
                      updateSelfMemberProfile(
                        { ...member, presentPhoto: nextUrl },
                        `Đã lưu ảnh hiện tại của ${member.fullName}.`
                      )
                    }
                    onDeleteImage={() =>
                      updateSelfMemberProfile(
                        { ...member, presentPhoto: '' },
                        `Đã xóa ảnh hiện tại của ${member.fullName}.`
                      )
                    }
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-center text-[11px] font-medium text-white truncate">
                  {member.presentLabel || 'Hiện tại'}
                </div>
              </div>
            </div>
          </div>

          {/* Identity & Career Info */}
          <div className="space-y-1.5">
            <InlineEditableText
              as="h2"
              value={member.fullName}
              canEdit={canEditMember(member)}
              stopPropagation
              label="Họ và tên thành viên"
              onSave={(val) =>
                updateSelfMemberProfile(
                  { ...member, fullName: val },
                  `Đã cập nhật họ tên thành "${val}".`
                )
              }
              className="font-display text-xl font-semibold text-white truncate"
            />
            <InlineEditableText
              as="p"
              value={member.role || ''}
              emptyDisplay="Đoàn viên Chi đoàn"
              allowEmpty
              canEdit={canEditMember(member)}
              stopPropagation
              label="Chức vụ / Vai trò"
              onSave={(val) =>
                updateSelfMemberProfile(
                  { ...member, role: val },
                  `Đã cập nhật chức vụ cho ${member.fullName}.`
                )
              }
              className="text-xs font-medium text-[#F02028] truncate"
            />
            <div className="text-xs text-zinc-300 truncate flex items-center gap-1">
              <InlineEditableText
                as="span"
                inline
                value={member.occupation || ''}
                emptyDisplay="Đang cập nhật nghề nghiệp"
                allowEmpty
                canEdit={canEditMember(member)}
                stopPropagation
                label="Nghề nghiệp"
                onSave={(val) =>
                  updateSelfMemberProfile(
                    { ...member, occupation: val },
                    `Đã cập nhật nghề nghiệp cho ${member.fullName}.`
                  )
                }
                className="text-xs text-zinc-300"
              />
              {member.field && (
                <>
                  <span aria-hidden="true">·</span>
                  <InlineEditableText
                    as="span"
                    inline
                    value={member.field}
                    allowEmpty
                    canEdit={canEditMember(member)}
                    stopPropagation
                    label="Lĩnh vực"
                    onSave={(val) =>
                      updateSelfMemberProfile(
                        { ...member, field: val },
                        `Đã cập nhật lĩnh vực cho ${member.fullName}.`
                      )
                    }
                    className="text-xs text-zinc-300"
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Gia nhập: </span>
              <InlineEditableText
                as="span"
                inline
                value={member.joinDate || ''}
                emptyDisplay="Chưa cập nhật"
                allowEmpty
                canEdit={canEditMember(member)}
                stopPropagation
                label="Ngày tham gia"
                onSave={(val) =>
                  updateSelfMemberProfile(
                    { ...member, joinDate: val },
                    `Đã cập nhật ngày tham gia cho ${member.fullName}.`
                  )
                }
                className="font-mono-num"
              />
            </div>
          </div>

          {/* Highlight Achievement */}
          {member.achievements.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2.5 text-xs text-zinc-300 space-y-1">
              <div className="font-medium text-white">Thành tích nổi bật</div>
              <InlineEditableText
                as="p"
                multiline
                collapsible
                collapsedLines={2}
                stopPropagation
                value={member.achievements[0]}
                canEdit={canEditMember(member)}
                label={`Thành tích nổi bật — ${member.fullName}`}
                onSave={(val) =>
                  updateSelfMemberProfile(
                    {
                      ...member,
                      achievements: member.achievements.map((item, i) => (i === 0 ? val : item)),
                    },
                    `Đã cập nhật thành tích nổi bật của ${member.fullName}.`
                  )
                }
                className="text-xs text-zinc-300 leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Contact Buttons + View Detail */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                title={`Gọi ${member.phone}`}
                aria-label="Điện thoại"
                className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-300 hover:border-[#F02028]/50 hover:text-white"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                title={member.email}
                aria-label="Email"
                className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-300 hover:border-[#F02028]/50 hover:text-white"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {(member.socials.facebook || member.socials.website) && (
              <a
                href={member.socials.facebook || member.socials.website}
                target="_blank"
                rel="noopener noreferrer"
                title="Liên kết mạng xã hội / Website"
                aria-label="Mạng xã hội"
                className="rounded-lg border border-white/10 bg-[#171719] p-2 text-zinc-300 hover:border-[#F02028]/50 hover:text-white"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedMemberId(member.id)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem chi tiết</span>
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <section className="corp-hero-sheet editorial-open-section rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-8 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-xs font-medium tracking-[0.08em] uppercase text-zinc-400">
              Thư viện hồ sơ qua các thời kỳ · <span className="font-mono-num">{cohorts.length}</span> niên khóa ·{' '}
              <span className="font-mono-num">{memberCount}</span> đoàn viên ·{' '}
              <span className="font-mono-num">{guestCount}</span> khách mời / người có liên quan
            </div>
            <h1 className="mt-2 font-display editorial-section-title text-2xl sm:text-4xl font-semibold text-white">
              Thành viên - Khách mời / Người có liên quan
            </h1>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingCohort(null);
                  setCohortModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#242428] px-4 py-2.5 text-xs font-semibold text-white hover:border-[#F02028] transition-colors whitespace-nowrap cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-[#F02028]" />
                <span>Thêm niên khóa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingMember(null);
                  setDefaultCohortForNewMember(cohortFilter !== 'all' && cohortFilter !== UNASSIGNED_COHORT_KEY ? cohortFilter : undefined);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm hồ sơ mới</span>
              </button>
            </div>
          ) : isSignedIn && currentUser && !data.members.some((m) => m.ownerUid === currentUser.uid) ? (
            <button
              type="button"
              onClick={() => {
                setEditingMember(null);
                setDefaultCohortForNewMember(cohortFilter !== 'all' && cohortFilter !== UNASSIGNED_COHORT_KEY ? cohortFilter : undefined);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo hồ sơ cá nhân của tôi</span>
            </button>
          ) : null}
        </div>

        {/* Search, Group Tabs, Cohort View Toggle & Sort Bar */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#242428] p-1 border border-white/10">
              {[
                { id: 'all', label: `Tất cả (${data.members.length})` },
                { id: 'member', label: `Đoàn viên Chi đoàn (${memberCount})` },
                { id: 'guest_advisor', label: `Khách mời / Người có liên quan (${guestCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGroupFilter(tab.id as 'all' | MemberGroup)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    groupFilter === tab.id ? 'bg-[#F02028] text-white' : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === 'by_cohort' ? 'flat' : 'by_cohort'))}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'by_cohort'
                    ? 'border-[#F02028] bg-[#F02028]/15 text-white'
                    : 'border-white/10 bg-[#242428] text-zinc-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#F02028]" />
                <span>{viewMode === 'by_cohort' ? 'Đang xem theo niên khóa' : 'Xem theo niên khóa'}</span>
              </button>

              <select
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                aria-label="Chọn niên khóa để xem"
                className="rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
              >
                <option value="all">Tất cả niên khóa ({cohorts.length})</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={UNASSIGNED_COHORT_KEY}>Chưa phân loại niên khóa</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, nghề nghiệp, lĩnh vực, niên khóa..."
                className="w-full rounded-xl border border-white/10 bg-[#242428] pl-10 pr-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sắp xếp thành viên"
              className="rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
            >
              <option value="manual">Thứ tự thủ công {isAdmin ? '(Kéo thả / Điều chỉnh)' : ''}</option>
              <option value="az">Họ tên A → Z</option>
              <option value="za">Họ tên Z → A</option>
              <option value="role">Theo chức vụ</option>
              <option value="joinDate">Ngày gia nhập</option>
            </select>
          </div>
        </div>

        {isAdmin && sortBy === 'manual' && (
          <div className="text-xs text-zinc-400 flex items-start gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-[#F02028] shrink-0 mt-0.5" />
            <span>
              Chế độ sắp xếp thủ công: Kéo thả thẻ thành viên hoặc dùng nút mũi tên để sắp xếp trong từng niên khóa;
              kéo thẻ sang khối niên khóa khác hoặc dùng mục &ldquo;Chuyển niên khóa&rdquo; để di chuyển giữa các niên
              khóa.
            </span>
          </div>
        )}
      </section>

      {/* Members Grouped by Cohort OR Flat Grid */}
      {viewMode === 'by_cohort' ? (
        cohortSections.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-[#171719] p-12 text-center text-sm text-zinc-400">
            Không tìm thấy hồ sơ thành viên phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-8">
            {cohortSections.map((section, secIdx) => {
              const cohort = section.cohort;
              const secMemberCount = section.members.filter((m) => m.group === 'member').length;
              const secGuestCount = section.members.filter((m) => m.group === 'guest_advisor').length;
              const scopeIds = section.members.map((m) => m.id);

              const linkedEvents = cohort
                ? data.events.filter((e) => (cohort.linkedEventIds || []).includes(e.id))
                : [];
              const linkedMilestones = cohort
                ? data.milestones.filter((ms) => (cohort.linkedMilestoneIds || []).includes(ms.id))
                : [];
              const linkedMessages = cohort
                ? data.leaderMessages.filter((msg) => (cohort.linkedMessageIds || []).includes(msg.id))
                : [];

              const cohortIdxInAll = cohort ? cohorts.findIndex((c) => c.id === cohort.id) : -1;

              return (
                <section
                  key={section.key}
                  onDragOver={(e) => {
                    if (isAdmin && sortBy === 'manual' && draggedId) {
                      e.preventDefault();
                      setDragOverCohortKey(section.key);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverCohortKey === section.key) setDragOverCohortKey(null);
                  }}
                  onDrop={() => handleDropOnCohortSection(section.key)}
                  className={`rounded-3xl border bg-[#171719] p-5 sm:p-7 space-y-6 transition-colors ${
                    dragOverCohortKey === section.key
                      ? 'border-[#F02028] bg-[#F02028]/5'
                      : 'border-white/10'
                  }`}
                >
                  {/* Cohort Header */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-white/10 pb-5">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="font-mono-num text-[#F02028] font-semibold">
                          0{secIdx + 1}
                        </span>
                        {cohort?.period && (
                          <>
                            <span aria-hidden="true">·</span>
                            <InlineEditableText
                              as="span"
                              inline
                              value={cohort.period}
                              canEdit={isAdmin}
                              label="Giai đoạn niên khóa"
                              onSave={(val) =>
                                updateData(
                                  (prev) => ({
                                    ...prev,
                                    cohorts: (prev.cohorts || []).map((c) =>
                                      c.id === cohort.id
                                        ? { ...c, period: val, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                        : c
                                    ),
                                  }),
                                  'Đã cập nhật giai đoạn niên khóa.'
                                )
                              }
                              className="text-xs text-zinc-400"
                            />
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>
                          <span className="font-mono-num text-white">{secMemberCount}</span> đoàn viên
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <span className="font-mono-num text-white">{secGuestCount}</span> khách mời / người có liên quan
                        </span>
                        {cohort?.dataOrigin === 'sample' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#F02028]">Mẫu</span>
                          </>
                        )}
                      </div>
                      {cohort ? (
                        <InlineEditableText
                          as="h2"
                          value={cohort.name}
                          canEdit={isAdmin}
                          label="Tên niên khóa"
                          onSave={(val) =>
                            updateData(
                              (prev) => ({
                                ...prev,
                                cohorts: (prev.cohorts || []).map((c) =>
                                  c.id === cohort.id
                                    ? { ...c, name: val, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                    : c
                                ),
                              }),
                              `Đã cập nhật tên niên khóa thành "${val}".`
                            )
                          }
                          className="font-display text-xl sm:text-2xl font-semibold text-white"
                        />
                      ) : (
                        <h2 className="font-display text-xl sm:text-2xl font-semibold text-white">
                          Chưa phân loại niên khóa
                        </h2>
                      )}
                      {cohort?.description && (
                        <InlineEditableText
                          as="p"
                          multiline
                          collapsible
                          collapsedLines={2}
                          allowEmpty
                          value={cohort.description}
                          canEdit={isAdmin}
                          label={`Mô tả niên khóa — ${cohort.name}`}
                          onSave={(val) =>
                            updateData(
                              (prev) => ({
                                ...prev,
                                cohorts: (prev.cohorts || []).map((c) =>
                                  c.id === cohort.id
                                    ? { ...c, description: val, dataOrigin: 'real', updatedAt: new Date().toISOString() }
                                    : c
                                ),
                              }),
                              'Đã cập nhật mô tả niên khóa.'
                            )
                          }
                          className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl"
                        />
                      )}
                      {!cohort && (
                        <p className="text-xs text-zinc-400">
                          Các hồ sơ chưa gắn niên khóa cụ thể. Quản trị viên hoặc thành viên có thể chọn niên khóa trong
                          mục chỉnh sửa hồ sơ.
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {cohort && sortBy === 'manual' && cohorts.length > 1 && (
                          <>
                            <button
                              type="button"
                              disabled={cohortIdxInAll <= 0}
                              onClick={() => handleMoveCohort(cohort.id, 'up')}
                              aria-label={`Đưa niên khóa ${cohort.name} lên`}
                              title="Đưa niên khóa lên trên"
                              className="rounded-lg border border-white/10 bg-[#242428] p-2 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={cohortIdxInAll === -1 || cohortIdxInAll >= cohorts.length - 1}
                              onClick={() => handleMoveCohort(cohort.id, 'down')}
                              aria-label={`Đưa niên khóa ${cohort.name} xuống`}
                              title="Đưa niên khóa xuống dưới"
                              className="rounded-lg border border-white/10 bg-[#242428] p-2 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMember(null);
                            setDefaultCohortForNewMember(cohort?.id);
                            setFormOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-[#F02028] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#F02028]" />
                          <span>Thêm vào niên khóa</span>
                        </button>
                        {cohort && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCohort(cohort);
                                setCohortModalOpen(true);
                              }}
                              aria-label={`Sửa niên khóa ${cohort.name}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#242428] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-[#F02028] cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Liên kết / Sửa</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCohort(cohort)}
                              aria-label={`Xóa niên khóa ${cohort.name}`}
                              className="rounded-xl border border-white/10 bg-[#242428] p-2 text-zinc-400 hover:text-[#F02028] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Linked Memoir Content for this Cohort */}
                  {cohort &&
                    (linkedEvents.length > 0 || linkedMilestones.length > 0 || linkedMessages.length > 0) && (
                      <div className="rounded-2xl border border-white/10 bg-[#242428]/70 p-4 space-y-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          Nội dung liên kết cùng {cohort.name}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {linkedEvents.map((evt) => (
                            <button
                              key={evt.id}
                              type="button"
                              onClick={() => setSelectedLinkedEventId(evt.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-zinc-200 hover:border-[#F02028]/60 hover:text-white transition-colors cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-[#F02028]" />
                              <span>{evt.title}</span>
                            </button>
                          ))}
                          {linkedMilestones.map((ms) => (
                            <button
                              key={ms.id}
                              type="button"
                              onClick={() => setActiveTab('home')}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-zinc-200 hover:border-[#F02028]/60 hover:text-white transition-colors cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 text-[#F02028]" />
                              <span>
                                {ms.year}: {ms.title}
                              </span>
                            </button>
                          ))}
                          {linkedMessages.map((msg) => (
                            <button
                              key={msg.id}
                              type="button"
                              onClick={() => setActiveTab('home')}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-zinc-200 hover:border-[#F02028]/60 hover:text-white transition-colors cursor-pointer"
                            >
                              <MessageSquareQuote className="w-3.5 h-3.5 text-[#F02028]" />
                              <span>{msg.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Members Grid inside Cohort */}
                  {section.members.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/40 p-8 text-center text-xs text-zinc-400">
                      {draggedId && isAdmin && sortBy === 'manual'
                        ? 'Thả thẻ thành viên vào đây để chuyển sang niên khóa này.'
                        : 'Chưa có thành viên, khách mời hoặc người có liên quan trong niên khóa này.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {section.members.map((member, idx) => renderMemberCard(member, scopeIds, idx))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-[#171719] p-12 text-center text-sm text-zinc-400">
          Không tìm thấy hồ sơ thành viên phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member, idx) =>
            renderMemberCard(
              member,
              filteredMembers.map((m) => m.id),
              idx
            )
          )}
        </div>
      )}

      <MemberDetailModal
        member={selectedMember}
        onClose={() => setSelectedMemberId(null)}
        onEdit={(m) => {
          setSelectedMemberId(null);
          setEditingMember(m);
          setDefaultCohortForNewMember(undefined);
          setFormOpen(true);
        }}
      />

      <MemberFormModal
        isOpen={formOpen}
        initialMember={editingMember}
        defaultCohortId={defaultCohortForNewMember}
        defaultGroup={groupFilter === 'guest_advisor' ? 'guest_advisor' : 'member'}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveMember}
      />

      <CohortFormModal
        isOpen={cohortModalOpen}
        initialCohort={editingCohort}
        onClose={() => setCohortModalOpen(false)}
        onSave={handleSaveCohort}
      />

      <EventDetailModal
        event={selectedLinkedEvent}
        onClose={() => setSelectedLinkedEventId(null)}
        onEdit={(evt) => {
          setSelectedLinkedEventId(null);
          setEditingLinkedEvent(evt);
          setLinkedEventFormOpen(true);
        }}
      />

      <EventFormModal
        isOpen={linkedEventFormOpen}
        initialEvent={editingLinkedEvent}
        onClose={() => setLinkedEventFormOpen(false)}
        onSave={(saved, options) => saveAndPublishEvent(saved, options)}
      />
    </div>
  );
}
