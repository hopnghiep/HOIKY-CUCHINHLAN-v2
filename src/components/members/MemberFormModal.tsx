import React, { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Plus, Upload, X } from 'lucide-react';
import type { CohortItem, MemberGroup, MemberProfile } from '../../types/memoir';
import { uploadOrEncodeMedia } from '../../services/indexedDb';
import { useMemoir } from '../../context/MemoirContext';
import { ResilientImage } from '../common/ResilientMedia';

interface MemberFormModalProps {
  isOpen: boolean;
  initialMember: MemberProfile | null;
  defaultCohortId?: string;
  onClose: () => void;
  onSave: (member: MemberProfile, publishImmediately?: boolean) => void;
}

export function MemberFormModal({
  isOpen,
  initialMember,
  defaultCohortId,
  onClose,
  onSave,
}: MemberFormModalProps) {
  const { data, isAdmin, updateData, notify } = useMemoir();

  const sortedCohorts = useMemo(
    () => [...(data.cohorts || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [data.cohorts]
  );

  const [group, setGroup] = useState<MemberGroup>('member');
  const [cohortId, setCohortId] = useState('');
  const [quickCohortOpen, setQuickCohortOpen] = useState(false);
  const [quickCohortName, setQuickCohortName] = useState('');
  const [quickCohortPeriod, setQuickCohortPeriod] = useState('');
  const [fullName, setFullName] = useState('');
  const [cohortLabel, setCohortLabel] = useState('Niên khóa');
  const [presentLabel, setPresentLabel] = useState('Hiện tại');
  const [youthPhoto, setYouthPhoto] = useState('');
  const [presentPhoto, setPresentPhoto] = useState('');
  const [role, setRole] = useState('');
  const [occupation, setOccupation] = useState('');
  const [field, setField] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [biography, setBiography] = useState('');
  const [selfIntro, setSelfIntro] = useState('');
  const [achievementsText, setAchievementsText] = useState('');
  const [favoriteQuote, setFavoriteQuote] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  const [zalo, setZalo] = useState('');
  const [viber, setViber] = useState('');
  const [ownerUid, setOwnerUid] = useState('');
  const [uploadingField, setUploadingField] = useState<'youth' | 'present' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuickCohortOpen(false);
    setQuickCohortName('');
    setQuickCohortPeriod('');
    if (initialMember) {
      setGroup(initialMember.group);
      setCohortId(initialMember.cohortId || '');
      setFullName(initialMember.fullName);
      setCohortLabel(initialMember.cohortLabel);
      setPresentLabel(initialMember.presentLabel);
      setYouthPhoto(initialMember.youthPhoto);
      setPresentPhoto(initialMember.presentPhoto);
      setRole(initialMember.role);
      setOccupation(initialMember.occupation);
      setField(initialMember.field);
      setJoinDate(initialMember.joinDate);
      setPhone(initialMember.phone);
      setEmail(initialMember.email);
      setBiography(initialMember.biography);
      setSelfIntro(initialMember.selfIntro);
      setAchievementsText(initialMember.achievements.join('\n'));
      setFavoriteQuote(initialMember.favoriteQuote);
      setFacebook(initialMember.socials.facebook || '');
      setWebsite(initialMember.socials.website || '');
      setZalo(initialMember.socials.zalo || '');
      setViber(initialMember.socials.viber || '');
      setOwnerUid(initialMember.ownerUid || '');
    } else {
      const initialCohort = sortedCohorts.find((c) => c.id === defaultCohortId);
      setGroup('member');
      setCohortId(initialCohort?.id || '');
      setFullName('');
      setCohortLabel(initialCohort?.name || 'Niên khóa');
      setPresentLabel('Hiện tại');
      setYouthPhoto('');
      setPresentPhoto('');
      setRole('');
      setOccupation('');
      setField('');
      setJoinDate('');
      setPhone('');
      setEmail('');
      setBiography('');
      setSelfIntro('');
      setAchievementsText('');
      setFavoriteQuote('');
      setFacebook('');
      setWebsite('');
      setZalo('');
      setViber('');
      setOwnerUid('');
    }
  }, [defaultCohortId, initialMember, isOpen, sortedCohorts]);

  if (!isOpen) return null;

  const handlePortraitUpload = async (target: 'youth' | 'present', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(target);
    try {
      const res = await uploadOrEncodeMedia(file, 'image');
      if (target === 'youth') setYouthPhoto(res.url);
      else setPresentPhoto(res.url);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể tải ảnh.', 'error');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const buildMemberPayload = (): MemberProfile | null => {
    if (!fullName.trim()) {
      notify('Vui lòng nhập họ và tên thành viên.', 'error');
      return null;
    }

    const achievements = achievementsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    // Preserve existing activityPhotos, articles, and orderIndex when editing!
    return {
      id: initialMember?.id || `mem_${Date.now()}`,
      group: isAdmin ? group : (initialMember?.group || group),
      cohortId: cohortId || undefined,
      fullName: fullName.trim(),
      youthPhoto: youthPhoto.trim(),
      presentPhoto: presentPhoto.trim(),
      cohortLabel: cohortLabel.trim() || 'Niên khóa',
      presentLabel: presentLabel.trim() || 'Hiện tại',
      role: role.trim(),
      occupation: occupation.trim(),
      field: field.trim(),
      joinDate: joinDate.trim(),
      phone: phone.trim(),
      email: email.trim(),
      biography: biography.trim(),
      selfIntro: selfIntro.trim(),
      achievements,
      activityPhotos: initialMember?.activityPhotos || [],
      articles: initialMember?.articles || [],
      socials: {
        facebook: facebook.trim() || undefined,
        website: website.trim() || undefined,
        zalo: zalo.trim() || undefined,
        viber: viber.trim() || undefined,
      },
      favoriteQuote: favoriteQuote.trim(),
      orderIndex: initialMember?.orderIndex ?? 999,
      dataOrigin: 'real',
      ownerUid: isAdmin ? ownerUid.trim() || undefined : initialMember?.ownerUid,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextMember = buildMemberPayload();
    if (!nextMember) return;
    onSave(nextMember, false);
    onClose();
  };

  const handleSaveAndPublish = () => {
    const nextMember = buildMemberPayload();
    if (!nextMember) return;
    onSave(nextMember, true);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#171719] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 mb-5">
          <h2 className="font-display text-xl font-semibold text-white">
            {initialMember
              ? `Cập nhật hồ sơ: ${initialMember.fullName}`
              : 'Thêm hồ sơ Thành viên - Khách mời / Người có liên quan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-sm">
          {/* Group & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Phân nhóm hồ sơ</label>
              <select
                value={group}
                disabled={!isAdmin && Boolean(initialMember)}
                onChange={(e) => setGroup(e.target.value as MemberGroup)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none disabled:opacity-60"
              >
                <option value="member">Đoàn viên Chi đoàn</option>
                <option value="guest_advisor">Khách mời / Người có liên quan</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-zinc-400 mb-1">Họ và tên *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Nguyễn Văn A"
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          {/* Cohort Dropdown & Guidance */}
          <div className="rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="member-cohort-select" className="text-xs font-semibold text-white">
                Chọn Niên khóa phân loại hồ sơ
              </label>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setQuickCohortOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#171719] px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F02028] cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#F02028]" />
                  <span>{quickCohortOpen ? 'Đóng tạo nhanh' : 'Thêm niên khóa nhanh'}</span>
                </button>
              )}
            </div>

            <select
              id="member-cohort-select"
              value={cohortId}
              onChange={(e) => {
                const nextId = e.target.value;
                const prevCohort = sortedCohorts.find((c) => c.id === cohortId);
                const nextCohort = sortedCohorts.find((c) => c.id === nextId);
                setCohortId(nextId);
                if (
                  nextCohort &&
                  (!cohortLabel.trim() ||
                    cohortLabel.trim() === 'Niên khóa' ||
                    (prevCohort && cohortLabel.trim() === prevCohort.name))
                ) {
                  setCohortLabel(nextCohort.name);
                }
              }}
              className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2.5 text-sm text-white focus:border-[#F02028] focus:outline-none"
            >
              <option value="">-- Chưa chọn niên khóa (Hiển thị ở nhóm chưa phân loại) --</option>
              {sortedCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.period ? ` (${c.period})` : ''}
                </option>
              ))}
            </select>

            <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#171719]/80 p-3 text-xs text-zinc-300 leading-relaxed">
              <HelpCircle className="w-4 h-4 text-[#F02028] shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-white">Hướng dẫn chọn niên khóa:</span> Chọn đúng niên khóa học tập,
                nhiệm kỳ sinh hoạt hoặc nhóm đồng hành để hồ sơ{' '}
                <span className="text-zinc-200">Đoàn viên / Khách mời / Người có liên quan</span> được phân loại chính
                xác khi xem theo niên khóa và tự động liên kết với các sự kiện, mốc son, lời ngỏ của niên khóa đó.
              </div>
            </div>

            {isAdmin && quickCohortOpen && (
              <div className="rounded-xl border border-[#F02028]/40 bg-[#171719] p-3.5 space-y-2.5">
                <div className="text-xs font-medium text-white">Tạo nhanh niên khóa mới</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={quickCohortName}
                    onChange={(e) => setQuickCohortName(e.target.value)}
                    placeholder="Tên niên khóa (VD: Niên khóa 2015–2018)"
                    className="rounded-lg border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={quickCohortPeriod}
                    onChange={(e) => setQuickCohortPeriod(e.target.value)}
                    placeholder="Giai đoạn (VD: 2015 - 2018)"
                    className="rounded-lg border border-white/10 bg-[#242428] px-3 py-2 text-xs text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!quickCohortName.trim()) {
                        notify('Vui lòng nhập tên niên khóa.', 'error');
                        return;
                      }
                      const created: CohortItem = {
                        id: `cohort_${Date.now()}`,
                        name: quickCohortName.trim(),
                        period: quickCohortPeriod.trim(),
                        description: '',
                        linkedEventIds: [],
                        linkedMilestoneIds: [],
                        linkedMessageIds: [],
                        orderIndex: sortedCohorts.length,
                        dataOrigin: 'real',
                      };
                      updateData(
                        (prev) => ({
                          ...prev,
                          cohorts: [...(prev.cohorts || []), created],
                        }),
                        `Đã tạo niên khóa "${created.name}".`
                      );
                      setCohortId(created.id);
                      if (!cohortLabel.trim() || cohortLabel.trim() === 'Niên khóa') {
                        setCohortLabel(created.name);
                      }
                      setQuickCohortName('');
                      setQuickCohortPeriod('');
                      setQuickCohortOpen(false);
                    }}
                    className="rounded-lg bg-[#F02028] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                  >
                    Lưu & Chọn niên khóa này
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Youth & Present Portraits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Ảnh chân dung thời trẻ</span>
                <label className="inline-flex items-center gap-1 rounded-lg bg-[#171719] border border-white/15 px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F02028] cursor-pointer">
                  <Upload className="w-3 h-3 text-[#F02028]" />
                  <span>{uploadingField === 'youth' ? 'Đang tải...' : 'Tải ảnh'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handlePortraitUpload('youth', e)}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="aspect-square max-h-40 mx-auto overflow-hidden rounded-xl border border-white/10 bg-[#171719]">
                <ResilientImage src={youthPhoto} alt="Ảnh thời trẻ" className="h-full w-full object-cover" />
              </div>
              <input
                type="text"
                value={cohortLabel}
                onChange={(e) => setCohortLabel(e.target.value)}
                placeholder="Nhãn niên khóa (VD: Niên khóa 1995-1998)"
                className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
              />
              <input
                type="text"
                value={youthPhoto}
                onChange={(e) => setYouthPhoto(e.target.value)}
                placeholder="Hoặc dán đường dẫn ảnh..."
                className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-zinc-300 focus:border-[#F02028] focus:outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#242428] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white">Ảnh chân dung hiện tại</span>
                <label className="inline-flex items-center gap-1 rounded-lg bg-[#171719] border border-white/15 px-2.5 py-1 text-xs text-zinc-200 hover:border-[#F02028] cursor-pointer">
                  <Upload className="w-3 h-3 text-[#F02028]" />
                  <span>{uploadingField === 'present' ? 'Đang tải...' : 'Tải ảnh'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => handlePortraitUpload('present', e)}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="aspect-square max-h-40 mx-auto overflow-hidden rounded-xl border border-white/10 bg-[#171719]">
                <ResilientImage src={presentPhoto} alt="Ảnh hiện tại" className="h-full w-full object-cover" />
              </div>
              <input
                type="text"
                value={presentLabel}
                onChange={(e) => setPresentLabel(e.target.value)}
                placeholder="Nhãn hiện tại (VD: Hiện tại)"
                className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
              />
              <input
                type="text"
                value={presentPhoto}
                onChange={(e) => setPresentPhoto(e.target.value)}
                placeholder="Hoặc dán đường dẫn ảnh..."
                className="w-full rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-zinc-300 focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          {/* Role, Occupation, Field, Join Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Chức vụ hoặc vai trò</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="VD: Bí thư Chi đoàn / Khách mời / Người có liên quan"
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Nghề nghiệp</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="VD: Bác sĩ / Kỹ sư / Giảng viên"
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Lĩnh vực chuyên môn</label>
              <input
                type="text"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="VD: Y tế, Giáo dục, Công nghệ..."
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Ngày tham gia Chi đoàn</label>
              <input
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          {/* Contact & Socials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Số điện thoại</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Facebook URL</label>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Website / Portfolio URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Zalo</label>
              <input
                type="text"
                value={zalo}
                onChange={(e) => setZalo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Viber</label>
              <input
                type="text"
                value={viber}
                onChange={(e) => setViber(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            {isAdmin && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-zinc-400 mb-1">
                  Firebase UID chủ hồ sơ (tùy chọn — cho phép thành viên tự cập nhật hồ sơ & xem liên hệ riêng tư)
                </label>
                <input
                  type="text"
                  value={ownerUid}
                  onChange={(e) => setOwnerUid(e.target.value)}
                  placeholder="Dán Firebase UID của thành viên (xem trong mục Cài đặt khi đăng nhập Google)"
                  className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs font-mono-num text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Bio, Intro, Achievements, Quote */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Tiểu sử</label>
              <textarea
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Giới thiệu bản thân</label>
              <textarea
                value={selfIntro}
                onChange={(e) => setSelfIntro(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Thành tích nổi bật (mỗi dòng 1 thành tích)</label>
              <textarea
                value={achievementsText}
                onChange={(e) => setAchievementsText(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Trích dẫn / Câu nói yêu thích</label>
              <input
                type="text"
                value={favoriteQuote}
                onChange={(e) => setFavoriteQuote(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Hủy
            </button>
            {!isAdmin && initialMember ? (
              <>
                <button
                  type="submit"
                  className="rounded-xl border border-white/15 bg-[#242428] px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 cursor-pointer"
                >
                  Lưu chỉnh sửa (chờ Cập nhật)
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndPublish}
                  className="rounded-xl bg-[#F02028] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                >
                  Lưu & Cập nhật lên App
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="rounded-xl bg-[#F02028] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
              >
                {initialMember ? 'Lưu thay đổi hồ sơ' : 'Thêm hồ sơ thành viên'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
