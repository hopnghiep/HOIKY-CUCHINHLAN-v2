import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Edit3,
  Flag,
  Globe,
  Layers,
  Mail,
  MessageCircle,
  MessageSquareQuote,
  Phone,
  Plus,
  Quote,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { MemberProfile } from '../../types/memoir';
import { ResilientImage } from '../common/ResilientMedia';
import { CollapsibleText } from '../common/CollapsibleText';
import { uploadOrEncodeMedia } from '../../services/indexedDb';

interface MemberDetailModalProps {
  member: MemberProfile | null;
  onClose: () => void;
  onEdit: (member: MemberProfile) => void;
}

export function MemberDetailModal({ member, onClose, onEdit }: MemberDetailModalProps) {
  const {
    data,
    isAdmin,
    isSaving,
    pendingMemberIds,
    canEditMember,
    updateSelfMemberProfile,
    publishMemberUpdate,
    notify,
  } = useMemoir();
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleContent, setNewArticleContent] = useState('');
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (!member) return null;

  const editable = canEditMember(member);
  const hasPendingUpdate = !isAdmin && editable && pendingMemberIds.includes(member.id);
  const memberCohort = (data.cohorts || []).find((c) => c.id === member.cohortId);
  const linkedEvents = memberCohort
    ? data.events.filter((e) => (memberCohort.linkedEventIds || []).includes(e.id))
    : [];
  const linkedMilestones = memberCohort
    ? data.milestones.filter((ms) => (memberCohort.linkedMilestoneIds || []).includes(ms.id))
    : [];
  const linkedMessages = memberCohort
    ? data.leaderMessages.filter((msg) => (memberCohort.linkedMessageIds || []).includes(msg.id))
    : [];

  const handleQuickPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const added: { id: string; url: string; caption: string; takenAt: string }[] = [];
      for (const file of files) {
        const res = await uploadOrEncodeMedia(file, 'image');
        added.push({
          id: `ap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          caption: file.name.replace(/\.[^.]+$/, ''),
          takenAt: new Date().toISOString().slice(0, 10),
        });
      }
      updateSelfMemberProfile(
        {
          ...member,
          activityPhotos: [...member.activityPhotos, ...added],
          dataOrigin: 'real',
          updatedAt: new Date().toISOString(),
        },
        isAdmin
          ? `Đã thêm ${added.length} ảnh hoạt động cho ${member.fullName}.`
          : `Đã thêm ${added.length} ảnh hoạt động. Nhấn "Cập nhật" để lưu lên ứng dụng.`
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải ảnh.', 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleAddArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleContent.trim()) return;
    updateSelfMemberProfile(
      {
        ...member,
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
        articles: [
          ...member.articles,
          {
            id: `art_${Date.now()}`,
            title: newArticleTitle.trim(),
            content: newArticleContent.trim(),
            publishedAt: new Date().toISOString().slice(0, 10),
          },
        ],
      },
      isAdmin
        ? 'Đã thêm bài viết chia sẻ mới.'
        : 'Đã thêm bài viết chia sẻ. Nhấn "Cập nhật" để lưu lên ứng dụng.'
    );
    setNewArticleTitle('');
    setNewArticleContent('');
    setShowArticleForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-detail-title"
    >
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#171719] shadow-2xl">
        {/* Sticky Modal Top Bar */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#171719]/95 px-6 py-4 backdrop-blur-md">
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#F02028]">
              {member.group === 'member' ? 'Đoàn viên Chi đoàn' : 'Khách mời / Người có liên quan'}
              {memberCohort ? ` · ${memberCohort.name}` : ''}
              {member.dataOrigin === 'sample' ? ' · Hồ sơ mẫu minh họa' : ''}
            </div>
            <h2 id="member-detail-title" className="truncate font-display text-xl sm:text-2xl font-semibold text-white">
              {member.fullName}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasPendingUpdate && (
              <button
                type="button"
                onClick={() => publishMemberUpdate(member.id)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Đang cập nhật...' : 'Cập nhật lên App'}</span>
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={() => onEdit(member)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#F02028]" />
                <span>{isAdmin ? 'Chỉnh sửa hồ sơ' : 'Sửa thông tin của tôi'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hồ sơ chi tiết"
              className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Dual Portrait Timeline Comparison + Personal Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#242428] p-5">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                <span>Chân dung qua thời gian</span>
                <span>Quá khứ → Hiện tại</span>
              </div>
              <div className="grid grid-cols-11 items-center gap-2">
                <div className="col-span-5 space-y-2">
                  <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-[#171719]">
                    <ResilientImage
                      src={member.youthPhoto}
                      alt={`${member.fullName} thời trẻ`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="text-center text-xs font-medium text-zinc-300 truncate">
                    {member.cohortLabel || 'Niên khóa'}
                  </div>
                </div>

                <div className="col-span-1 flex justify-center">
                  <ArrowRight className="w-4 h-4 text-[#F02028]" />
                </div>

                <div className="col-span-5 space-y-2">
                  <div className="aspect-square overflow-hidden rounded-xl border border-[#F02028]/40 bg-[#171719]">
                    <ResilientImage
                      src={member.presentPhoto}
                      alt={`${member.fullName} hiện tại`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="text-center text-xs font-semibold text-white truncate">
                    {member.presentLabel || 'Hiện tại'}
                  </div>
                </div>
              </div>

              {member.favoriteQuote && (
                <div className="mt-5 pt-4 border-t border-white/10 flex items-start gap-2.5">
                  <Quote className="w-4 h-4 shrink-0 text-[#F02028] mt-0.5" />
                  <CollapsibleText
                    as="p"
                    text={`“${member.favoriteQuote}”`}
                    collapsedLines={2}
                    className="text-xs italic text-zinc-300 leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-[#242428] p-5 text-sm">
                <div>
                  <div className="text-xs text-zinc-400">Chức vụ / Vai trò</div>
                  <div className="mt-0.5 font-medium text-white">{member.role || 'Đoàn viên'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Nghề nghiệp & Lĩnh vực</div>
                  <div className="mt-0.5 font-medium text-white">
                    {member.occupation || 'Đang cập nhật'}
                    {member.field ? ` · ${member.field}` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Ngày tham gia & Niên khóa</div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono-num text-zinc-200">
                    <Calendar className="w-3.5 h-3.5 text-[#F02028]" />
                    <span>{member.joinDate || 'Chưa cập nhật'}</span>
                  </div>
                  {memberCohort && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
                      <Layers className="w-3.5 h-3.5 text-[#F02028]" />
                      <span>{memberCohort.name}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Thông tin liên hệ</div>
                  <div className="mt-0.5 space-y-1 text-xs text-zinc-300">
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 hover:text-white">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="font-mono-num">{member.phone}</span>
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 hover:text-white">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    )}
                    {!member.phone && !member.email && (
                      <div className="text-[11px] text-zinc-500">
                        {editable
                          ? 'Chưa cập nhật số điện thoại / email.'
                          : 'Được bảo vệ riêng tư (chỉ chủ hồ sơ & Quản trị viên xem được).'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Social & Messaging Links */}
              <div className="flex flex-wrap items-center gap-2">
                {member.socials.facebook && (
                  <a
                    href={member.socials.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-zinc-200 hover:border-[#F02028]/50 hover:text-white"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#F02028]" />
                    Facebook
                  </a>
                )}
                {member.socials.website && (
                  <a
                    href={member.socials.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-zinc-200 hover:border-[#F02028]/50 hover:text-white"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#F02028]" />
                    Website / Portfolio
                  </a>
                )}
                {member.socials.zalo && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-zinc-200">
                    <MessageCircle className="w-3.5 h-3.5 text-[#F02028]" />
                    Zalo: <span className="font-mono-num">{member.socials.zalo}</span>
                  </span>
                )}
                {member.socials.viber && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#242428] px-3.5 py-2 text-xs text-zinc-200">
                    <MessageCircle className="w-3.5 h-3.5 text-[#F02028]" />
                    Viber: <span className="font-mono-num">{member.socials.viber}</span>
                  </span>
                )}
              </div>

              {/* Biography & Self Intro */}
              <div className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">Tiểu sử</h3>
                  <CollapsibleText
                    as="p"
                    text={member.biography || 'Chưa cập nhật tiểu sử.'}
                    collapsedLines={3}
                    className="text-sm text-zinc-200 leading-relaxed"
                  />
                </div>
                {member.selfIntro && (
                  <div className="pt-3 border-t border-white/10">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Giới thiệu bản thân
                    </h3>
                    <CollapsibleText
                      as="p"
                      text={member.selfIntro}
                      collapsedLines={3}
                      className="text-sm text-zinc-300 leading-relaxed"
                    />
                  </div>
                )}
              </div>
              {/* Cohort Linked Content */}
              {memberCohort &&
                (linkedEvents.length > 0 || linkedMilestones.length > 0 || linkedMessages.length > 0) && (
                  <div className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      <Layers className="w-3.5 h-3.5 text-[#F02028]" />
                      <span>Nội dung Hồi ký liên kết qua {memberCohort.name}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {linkedEvents.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-[#171719] p-3 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <Calendar className="w-3.5 h-3.5 text-[#F02028]" />
                            <span>Sự kiện ({linkedEvents.length})</span>
                          </div>
                          {linkedEvents.map((evt) => (
                            <div key={evt.id} className="text-zinc-300 truncate">
                              · {evt.title}
                            </div>
                          ))}
                        </div>
                      )}
                      {linkedMilestones.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-[#171719] p-3 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <Flag className="w-3.5 h-3.5 text-[#F02028]" />
                            <span>Mốc son ({linkedMilestones.length})</span>
                          </div>
                          {linkedMilestones.map((ms) => (
                            <div key={ms.id} className="text-zinc-300 truncate">
                              · {ms.title}
                            </div>
                          ))}
                        </div>
                      )}
                      {linkedMessages.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-[#171719] p-3 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-white">
                            <MessageSquareQuote className="w-3.5 h-3.5 text-[#F02028]" />
                            <span>Lời ngỏ ({linkedMessages.length})</span>
                          </div>
                          {linkedMessages.map((msg) => (
                            <div key={msg.id} className="text-zinc-300 truncate">
                              · {msg.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Achievements */}
          <section className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Award className="w-4 h-4 text-[#F02028]" />
              <span>Thành tích nổi bật</span>
            </div>
            {member.achievements.length === 0 ? (
              <p className="text-xs text-zinc-400">Chưa có thành tích được ghi nhận.</p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {member.achievements.map((ach, idx) => (
                  <li
                    key={idx}
                    className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2.5 text-sm text-zinc-200"
                  >
                    <span className="font-mono-num text-xs text-[#F02028] mr-2">0{idx + 1}.</span>
                    {ach}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity Photos Gallery */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">
                Thư viện ảnh hoạt động ({member.activityPhotos.length})
              </h3>
              {editable && (
                <label className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Đang tải...' : 'Thêm nhiều ảnh'}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleQuickPhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {member.activityPhotos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
                Chưa có hình ảnh hoạt động nào cho thành viên này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {member.activityPhotos.map((photo) => (
                  <figure
                    key={photo.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#242428]"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <ResilientImage
                        src={photo.url}
                        alt={photo.caption}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <figcaption className="p-3 text-xs text-zinc-300 flex items-center justify-between gap-2">
                      <span className="truncate">{photo.caption}</span>
                      <span className="font-mono-num text-[11px] text-zinc-500 shrink-0">{photo.takenAt}</span>
                    </figcaption>
                    {editable && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSelfMemberProfile(
                            {
                              ...member,
                              activityPhotos: member.activityPhotos.filter((p) => p.id !== photo.id),
                            },
                            isAdmin
                              ? 'Đã xóa ảnh khỏi hồ sơ.'
                              : 'Đã gỡ ảnh khỏi hồ sơ. Nhấn "Cập nhật" để lưu lên Cloud Firestore.'
                          )
                        }
                        aria-label="Xóa ảnh"
                        className="absolute top-2 right-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-[#F02028] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </section>

          {/* Shared Articles */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-base font-semibold text-white">
                <BookOpen className="w-4 h-4 text-[#F02028]" />
                <span>Bài viết chia sẻ ({member.articles.length})</span>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => setShowArticleForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F02028]" />
                  Thêm bài viết
                </button>
              )}
            </div>

            {showArticleForm && (
              <form
                onSubmit={handleAddArticle}
                className="rounded-2xl border border-[#F02028]/50 bg-[#242428] p-4 space-y-3"
              >
                <input
                  type="text"
                  value={newArticleTitle}
                  onChange={(e) => setNewArticleTitle(e.target.value)}
                  required
                  placeholder="Tiêu đề bài viết"
                  className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
                <textarea
                  value={newArticleContent}
                  onChange={(e) => setNewArticleContent(e.target.value)}
                  rows={4}
                  required
                  placeholder="Nội dung hồi ức chia sẻ..."
                  className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowArticleForm(false)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                  >
                    Đăng bài viết
                  </button>
                </div>
              </form>
            )}

            {member.articles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
                Chưa có bài viết chia sẻ nào.
              </div>
            ) : (
              <div className="space-y-3">
                {member.articles.map((art) => (
                  <article key={art.id} className="rounded-2xl border border-white/10 bg-[#242428] p-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-white">{art.title}</h4>
                        <div className="font-mono-num text-xs text-zinc-400 mt-0.5">{art.publishedAt}</div>
                      </div>
                      {editable && (
                        <button
                          type="button"
                          onClick={() =>
                            updateSelfMemberProfile(
                              {
                                ...member,
                                articles: member.articles.filter((a) => a.id !== art.id),
                              },
                              isAdmin
                                ? 'Đã xóa bài viết chia sẻ.'
                                : 'Đã gỡ bài viết. Nhấn "Cập nhật" để lưu lên Cloud Firestore.'
                            )
                          }
                          aria-label="Xóa bài viết"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <CollapsibleText
                      as="p"
                      text={art.content}
                      collapsedLines={3}
                      className="text-sm text-zinc-300 leading-relaxed"
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
