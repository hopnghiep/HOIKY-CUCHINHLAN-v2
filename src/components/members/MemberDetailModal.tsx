import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Flag,
  Globe,
  Layers,
  Link2,
  Mail,
  MessageCircle,
  MessageSquareQuote,
  Phone,
  Play,
  Plus,
  Quote,
  RefreshCw,
  Trash2,
  Upload,
  X,
  Youtube,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { MemberDocument, MemberProfile, MemberYoutubeVideo } from '../../types/memoir';
import { ResilientImage } from '../common/ResilientMedia';
import { InlineEditableText } from '../common/InlineEditableText';
import { uploadOrEncodeDocument, uploadOrEncodeMedia } from '../../services/indexedDb';
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from '../../utils/youtube';

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface MemberDetailModalProps {
  member: MemberProfile | null;
  onClose: () => void;
  onEdit: (member: MemberProfile) => void;
}

export function MemberDetailModal({ member, onClose, onEdit }: MemberDetailModalProps) {
  const {
    data,
    isAdmin,
    currentUser,
    firestoreSynced,
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

  const [showYoutubeForm, setShowYoutubeForm] = useState(false);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [newYoutubeTitle, setNewYoutubeTitle] = useState('');
  const [newYoutubeNotes, setNewYoutubeNotes] = useState('');

  const [showDocLinkForm, setShowDocLinkForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingYoutubeId, setPlayingYoutubeId] = useState<string | null>(null);

  if (!member) return null;

  const editable = canEditMember(member);
  const hasPendingUpdate = !isAdmin && editable && pendingMemberIds.includes(member.id);
  const youtubeVideos: MemberYoutubeVideo[] = Array.isArray(member.youtubeVideos) ? member.youtubeVideos : [];
  const memberDocuments: MemberDocument[] = Array.isArray(member.documents) ? member.documents : [];
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

  const saveMemberPatch = (patch: Partial<MemberProfile>, toastMessage: string) => {
    updateSelfMemberProfile(
      {
        ...member,
        ...patch,
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
      },
      toastMessage
    );
  };

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
        `Đã thêm và lưu ${added.length} ảnh hoạt động cho ${member.fullName}.`
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
      'Đã thêm và lưu bài viết chia sẻ mới.'
    );
    setNewArticleTitle('');
    setNewArticleContent('');
    setShowArticleForm(false);
  };

  const copyTextToClipboard = async (text: string, itemId: string, successMessage: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(itemId);
      notify(successMessage, 'success');
      setTimeout(() => {
        setCopiedId((prev) => (prev === itemId ? null : prev));
      }, 2000);
    } catch {
      notify('Không thể sao chép tự động trên trình duyệt này.', 'error');
    }
  };

  const handleAddYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = newYoutubeUrl.trim();
    if (!getYoutubeEmbedUrl(trimmedUrl)) {
      notify('Đường dẫn YouTube không hợp lệ. Vui lòng dán link youtube.com hoặc youtu.be.', 'error');
      return;
    }
    const item: MemberYoutubeVideo = {
      id: `ytm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newYoutubeTitle.trim() || 'Video YouTube chia sẻ',
      youtubeUrl: trimmedUrl,
      notes: newYoutubeNotes.trim(),
      addedAt: new Date().toISOString().slice(0, 10),
    };
    updateSelfMemberProfile(
      {
        ...member,
        youtubeVideos: [...youtubeVideos, item],
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
      },
      'Đã thêm và lưu liên kết YouTube vào hồ sơ.'
    );
    setNewYoutubeUrl('');
    setNewYoutubeTitle('');
    setNewYoutubeNotes('');
    setShowYoutubeForm(false);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingDoc(true);
    try {
      const added: MemberDocument[] = [];
      for (const file of files) {
        const res = await uploadOrEncodeDocument(file);
        added.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: file.name.replace(/\.[^.]+$/, '') || file.name,
          fileName: res.fileName,
          url: res.url,
          mimeType: res.mimeType,
          sizeBytes: res.sizeBytes,
          notes: '',
          uploadedAt: new Date().toISOString().slice(0, 10),
        });
      }
      updateSelfMemberProfile(
        {
          ...member,
          documents: [...memberDocuments, ...added],
          dataOrigin: 'real',
          updatedAt: new Date().toISOString(),
        },
        `Đã tải lên và lưu ${added.length} tài liệu cá nhân cho ${member.fullName}.`
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi tải tài liệu.', 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  const handleAddDocLink = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newDocTitle.trim();
    const url = newDocUrl.trim();
    if (!title) {
      notify('Vui lòng nhập tên tài liệu.', 'error');
      return;
    }
    if (!url) {
      notify('Vui lòng nhập đường dẫn tài liệu (Google Drive, OneDrive, PDF...).', 'error');
      return;
    }
    const item: MemberDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      fileName: title,
      url,
      mimeType: 'text/uri-list',
      notes: newDocNotes.trim(),
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    updateSelfMemberProfile(
      {
        ...member,
        documents: [...memberDocuments, item],
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
      },
      'Đã lưu liên kết tài liệu cá nhân.'
    );
    setNewDocTitle('');
    setNewDocUrl('');
    setNewDocNotes('');
    setShowDocLinkForm(false);
  };

  const resolveShareableDocUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    return `${window.location.origin}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
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
            <InlineEditableText
              as="h2"
              value={member.fullName}
              canEdit={editable}
              label="Họ và tên thành viên"
              onSave={(val) => saveMemberPatch({ fullName: val }, `Đã cập nhật họ tên thành "${val}".`)}
              className="truncate font-display text-xl sm:text-2xl font-semibold text-white"
            />
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
                <span>Chỉnh sửa hồ sơ</span>
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
                      downloadFileName={`${member.fullName}-thoi-tre`}
                      viewerSubtitle={`${member.fullName} · ${member.cohortLabel || 'Thời trẻ'}`}
                      canEdit={editable}
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
                  <div className="text-center text-xs font-medium text-zinc-300 truncate">
                    <InlineEditableText
                      as="span"
                      inline
                      value={member.cohortLabel || ''}
                      emptyDisplay="Niên khóa"
                      allowEmpty
                      canEdit={editable}
                      label="Nhãn ảnh thời trẻ"
                      onSave={(val) => saveMemberPatch({ cohortLabel: val }, 'Đã cập nhật nhãn ảnh thời trẻ.')}
                      className="text-xs font-medium text-zinc-300"
                    />
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
                      downloadFileName={`${member.fullName}-hien-tai`}
                      viewerSubtitle={`${member.fullName} · ${member.presentLabel || 'Hiện tại'}`}
                      canEdit={editable}
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
                  <div className="text-center text-xs font-semibold text-white truncate">
                    <InlineEditableText
                      as="span"
                      inline
                      value={member.presentLabel || ''}
                      emptyDisplay="Hiện tại"
                      allowEmpty
                      canEdit={editable}
                      label="Nhãn ảnh hiện tại"
                      onSave={(val) => saveMemberPatch({ presentLabel: val }, 'Đã cập nhật nhãn ảnh hiện tại.')}
                      className="text-xs font-semibold text-white"
                    />
                  </div>
                </div>
              </div>

              {member.favoriteQuote && (
                <div className="mt-5 pt-4 border-t border-white/10 flex items-start gap-2.5">
                  <Quote className="w-4 h-4 shrink-0 text-[#F02028] mt-0.5" />
                  <InlineEditableText
                    as="p"
                    multiline
                    collapsible
                    collapsedLines={2}
                    allowEmpty
                    value={member.favoriteQuote}
                    canEdit={editable}
                    label="Câu nói / Châm ngôn yêu thích"
                    onSave={(val) => saveMemberPatch({ favoriteQuote: val }, 'Đã cập nhật câu nói yêu thích.')}
                    className="text-xs italic text-zinc-300 leading-relaxed"
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-[#242428] p-5 text-sm">
                <div>
                  <div className="text-xs text-zinc-400">Chức vụ / Vai trò</div>
                  <div className="mt-0.5">
                    <InlineEditableText
                      as="div"
                      value={member.role || ''}
                      emptyDisplay="Đoàn viên"
                      allowEmpty
                      canEdit={editable}
                      label="Chức vụ / Vai trò"
                      onSave={(val) => saveMemberPatch({ role: val }, 'Đã cập nhật chức vụ / vai trò.')}
                      className="font-medium text-white"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Nghề nghiệp & Lĩnh vực</div>
                  <div className="mt-0.5 font-medium text-white flex flex-wrap items-center gap-1">
                    <InlineEditableText
                      as="span"
                      inline
                      value={member.occupation || ''}
                      emptyDisplay="Đang cập nhật"
                      allowEmpty
                      canEdit={editable}
                      label="Nghề nghiệp"
                      onSave={(val) => saveMemberPatch({ occupation: val }, 'Đã cập nhật nghề nghiệp.')}
                      className="font-medium text-white"
                    />
                    {member.field && (
                      <>
                        <span className="text-zinc-400">·</span>
                        <InlineEditableText
                          as="span"
                          inline
                          value={member.field}
                          allowEmpty
                          canEdit={editable}
                          label="Lĩnh vực"
                          onSave={(val) => saveMemberPatch({ field: val }, 'Đã cập nhật lĩnh vực công tác.')}
                          className="font-medium text-white"
                        />
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Ngày tham gia & Niên khóa</div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono-num text-zinc-200">
                    <Calendar className="w-3.5 h-3.5 text-[#F02028]" />
                    <InlineEditableText
                      as="span"
                      inline
                      value={member.joinDate || ''}
                      emptyDisplay="Chưa cập nhật"
                      allowEmpty
                      canEdit={editable}
                      label="Ngày tham gia"
                      onSave={(val) => saveMemberPatch({ joinDate: val }, 'Đã cập nhật ngày tham gia.')}
                      className="font-mono-num text-zinc-200"
                    />
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
                        {isAdmin || !firestoreSynced || (currentUser && member.ownerUid === currentUser.uid)
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
                  <InlineEditableText
                    as="p"
                    multiline
                    collapsible
                    collapsedLines={3}
                    allowEmpty
                    value={member.biography || ''}
                    emptyDisplay="Chưa cập nhật tiểu sử."
                    canEdit={editable}
                    label="Tiểu sử thành viên"
                    onSave={(val) => saveMemberPatch({ biography: val }, 'Đã cập nhật tiểu sử thành viên.')}
                    className="text-sm text-zinc-200 leading-relaxed"
                  />
                </div>
                {member.selfIntro && (
                  <div className="pt-3 border-t border-white/10">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                      Giới thiệu bản thân
                    </h3>
                    <InlineEditableText
                      as="p"
                      multiline
                      collapsible
                      collapsedLines={3}
                      allowEmpty
                      value={member.selfIntro}
                      canEdit={editable}
                      label="Giới thiệu bản thân"
                      onSave={(val) => saveMemberPatch({ selfIntro: val }, 'Đã cập nhật phần giới thiệu bản thân.')}
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
                    className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2.5 text-sm text-zinc-200 flex items-start gap-2"
                  >
                    <span className="font-mono-num text-xs text-[#F02028] shrink-0 mt-0.5">0{idx + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <InlineEditableText
                        as="p"
                        multiline
                        collapsible={false}
                        value={ach}
                        canEdit={editable}
                        label={`Thành tích nổi bật #${idx + 1}`}
                        onSave={(val) =>
                          saveMemberPatch(
                            {
                              achievements: member.achievements.map((item, i) => (i === idx ? val : item)),
                            },
                            'Đã cập nhật thành tích nổi bật.'
                          )
                        }
                        className="text-sm text-zinc-200"
                      />
                    </div>
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
                        alt={photo.caption || `Ảnh hoạt động của ${member.fullName}`}
                        downloadFileName={`${member.fullName}-${photo.caption || photo.id}`}
                        viewerSubtitle={`${member.fullName}${photo.takenAt ? ` · ${photo.takenAt}` : ''}`}
                        canEdit={editable}
                        onChangeImage={(nextUrl) =>
                          updateSelfMemberProfile(
                            {
                              ...member,
                              activityPhotos: member.activityPhotos.map((p) =>
                                p.id === photo.id ? { ...p, url: nextUrl } : p
                              ),
                            },
                            'Đã lưu thay đổi ảnh hoạt động.'
                          )
                        }
                        onDeleteImage={() =>
                          updateSelfMemberProfile(
                            {
                              ...member,
                              activityPhotos: member.activityPhotos.filter((p) => p.id !== photo.id),
                            },
                            'Đã xóa ảnh khỏi hồ sơ.'
                          )
                        }
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <figcaption className="p-3 text-xs text-zinc-300 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <InlineEditableText
                          as="span"
                          value={photo.caption || ''}
                          emptyDisplay="Chưa có chú thích"
                          allowEmpty
                          canEdit={editable}
                          label="Chú thích ảnh hoạt động"
                          onSave={(val) =>
                            saveMemberPatch(
                              {
                                activityPhotos: member.activityPhotos.map((p) =>
                                  p.id === photo.id ? { ...p, caption: val } : p
                                ),
                              },
                              'Đã cập nhật chú thích ảnh hoạt động.'
                            )
                          }
                          className="block truncate text-xs text-zinc-300"
                        />
                      </div>
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
                            'Đã xóa ảnh khỏi hồ sơ.'
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
                      <div className="min-w-0 flex-1">
                        <InlineEditableText
                          as="h4"
                          value={art.title}
                          canEdit={editable}
                          label="Tiêu đề bài viết chia sẻ"
                          onSave={(val) =>
                            saveMemberPatch(
                              {
                                articles: member.articles.map((a) =>
                                  a.id === art.id ? { ...a, title: val } : a
                                ),
                              },
                              'Đã cập nhật tiêu đề bài viết.'
                            )
                          }
                          className="font-semibold text-white"
                        />
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
                              'Đã xóa bài viết chia sẻ.'
                            )
                          }
                          aria-label="Xóa bài viết"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <InlineEditableText
                      as="p"
                      multiline
                      collapsible
                      collapsedLines={3}
                      value={art.content}
                      canEdit={editable}
                      label={`Bài viết: ${art.title}`}
                      onSave={(val) =>
                        saveMemberPatch(
                          {
                            articles: member.articles.map((a) =>
                              a.id === art.id ? { ...a, content: val } : a
                            ),
                          },
                          'Đã cập nhật nội dung bài viết.'
                        )
                      }
                      className="text-sm text-zinc-300 leading-relaxed"
                    />
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Personal YouTube Videos */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-base font-semibold text-white">
                <Youtube className="w-4 h-4 text-[#F02028]" />
                <span>Video YouTube cá nhân ({youtubeVideos.length})</span>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => setShowYoutubeForm((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F02028]" />
                  <span>Thêm link YouTube</span>
                </button>
              )}
            </div>

            {showYoutubeForm && (
              <form
                onSubmit={handleAddYoutube}
                className="rounded-2xl border border-[#F02028]/50 bg-[#242428] p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="url"
                    value={newYoutubeUrl}
                    onChange={(e) => setNewYoutubeUrl(e.target.value)}
                    required
                    placeholder="Dán link YouTube (VD: https://youtu.be/...)"
                    className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newYoutubeTitle}
                    onChange={(e) => setNewYoutubeTitle(e.target.value)}
                    placeholder="Tiêu đề video (tùy chọn)"
                    className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={newYoutubeNotes}
                  onChange={(e) => setNewYoutubeNotes(e.target.value)}
                  placeholder="Ghi chú ngắn về video (tùy chọn)..."
                  className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowYoutubeForm(false)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                  >
                    Lưu link YouTube
                  </button>
                </div>
              </form>
            )}

            {youtubeVideos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
                Chưa có liên kết video YouTube nào được lưu.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {youtubeVideos.map((vid) => {
                  const embedUrl = getYoutubeEmbedUrl(vid.youtubeUrl);
                  const thumbUrl = getYoutubeThumbnailUrl(vid.youtubeUrl);
                  const isPlaying = playingYoutubeId === vid.id && Boolean(embedUrl);
                  return (
                    <article
                      key={vid.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-[#242428] flex flex-col"
                    >
                      {isPlaying && embedUrl ? (
                        <div className="aspect-video w-full bg-black">
                          <iframe
                            src={`${embedUrl}?autoplay=1`}
                            title={vid.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full border-0"
                          />
                        </div>
                      ) : thumbUrl ? (
                        <button
                          type="button"
                          onClick={() => setPlayingYoutubeId(vid.id)}
                          aria-label={`Phát video ${vid.title}`}
                          className="group relative aspect-video w-full overflow-hidden bg-black text-left cursor-pointer"
                        >
                          <img
                            src={thumbUrl}
                            alt={vid.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F02028]/95 text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div className="aspect-video w-full bg-[#171719] flex items-center justify-center text-xs text-zinc-400 px-3 text-center">
                          Không có ảnh thu nhỏ. Mở trực tiếp trên YouTube.
                        </div>
                      )}
                      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                        <div className="space-y-1">
                          <InlineEditableText
                            as="h4"
                            value={vid.title}
                            canEdit={editable}
                            label="Tiêu đề video YouTube"
                            onSave={(val) =>
                              saveMemberPatch(
                                {
                                  youtubeVideos: youtubeVideos.map((v) =>
                                    v.id === vid.id ? { ...v, title: val } : v
                                  ),
                                },
                                'Đã cập nhật tiêu đề video YouTube.'
                              )
                            }
                            className="font-semibold text-xs sm:text-sm text-white line-clamp-1"
                          />
                          {vid.notes && (
                            <InlineEditableText
                              as="p"
                              multiline
                              collapsible={false}
                              allowEmpty
                              value={vid.notes}
                              canEdit={editable}
                              label="Ghi chú video YouTube"
                              onSave={(val) =>
                                saveMemberPatch(
                                  {
                                    youtubeVideos: youtubeVideos.map((v) =>
                                      v.id === vid.id ? { ...v, notes: val } : v
                                    ),
                                  },
                                  'Đã cập nhật ghi chú video YouTube.'
                                )
                              }
                              className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2"
                            />
                          )}
                          <div className="font-mono-num text-[10px] text-zinc-500">{vid.addedAt}</div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                copyTextToClipboard(
                                  vid.youtubeUrl,
                                  `yt_${vid.id}`,
                                  'Đã sao chép đường dẫn YouTube.'
                                )
                              }
                              title="Sao chép link YouTube"
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171719] px-2 py-1 text-[11px] text-zinc-200 hover:border-[#F02028]/60 hover:text-white cursor-pointer"
                            >
                              {copiedId === `yt_${vid.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <a
                              href={vid.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Mở trên YouTube"
                              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171719] px-2 py-1 text-[11px] text-zinc-200 hover:border-[#F02028]/60 hover:text-white"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Mở</span>
                            </a>
                          </div>

                          {editable && (
                            <button
                              type="button"
                              onClick={() => {
                                if (playingYoutubeId === vid.id) setPlayingYoutubeId(null);
                                updateSelfMemberProfile(
                                  {
                                    ...member,
                                    youtubeVideos: youtubeVideos.filter((v) => v.id !== vid.id),
                                  },
                                  'Đã xóa video YouTube khỏi hồ sơ.'
                                );
                              }}
                              aria-label="Xóa video YouTube"
                              title="Xóa video"
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Personal Documents Archive */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-base font-semibold text-white">
                <FileText className="w-4 h-4 text-[#F02028]" />
                <span>Tài liệu cá nhân lưu trữ ({memberDocuments.length})</span>
              </div>
              {editable && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDocLinkForm((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5 text-[#F02028]" />
                    <span>Thêm link tài liệu</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDoc ? 'Đang tải...' : 'Tải lên tài liệu'}</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.odt,.ods,.odp,.zip,.rar,.7z,image/*,audio/*"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {showDocLinkForm && (
              <form
                onSubmit={handleAddDocLink}
                className="rounded-2xl border border-[#F02028]/50 bg-[#242428] p-4 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    required
                    placeholder="Tên tài liệu *"
                    className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                  <input
                    type="url"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    required
                    placeholder="Đường dẫn tài liệu (Google Drive, PDF, OneDrive...)"
                    className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={newDocNotes}
                  onChange={(e) => setNewDocNotes(e.target.value)}
                  placeholder="Mô tả / ghi chú tài liệu (tùy chọn)..."
                  className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDocLinkForm(false)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-zinc-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
                  >
                    Lưu tài liệu
                  </button>
                </div>
              </form>
            )}

            {memberDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
                Chưa có tài liệu cá nhân nào. Thành viên có thể tải lên tệp (PDF, Word, Excel, PowerPoint, ảnh, ZIP...) hoặc lưu link tài liệu để lưu trữ tự do.
              </div>
            ) : (
              <div className="space-y-2.5">
                {memberDocuments.map((docItem) => {
                  const shareUrl = resolveShareableDocUrl(docItem.url);
                  const isExternalLink = docItem.mimeType === 'text/uri-list';
                  const sizeLabel = formatFileSize(docItem.sizeBytes);
                  return (
                    <div
                      key={docItem.id}
                      className="rounded-2xl border border-white/10 bg-[#242428] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="rounded-xl border border-white/10 bg-[#171719] p-2.5 text-[#F02028] shrink-0">
                          {isExternalLink ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <InlineEditableText
                            as="h4"
                            value={docItem.title}
                            canEdit={editable}
                            label="Tên tài liệu cá nhân"
                            onSave={(val) =>
                              saveMemberPatch(
                                {
                                  documents: memberDocuments.map((d) =>
                                    d.id === docItem.id ? { ...d, title: val } : d
                                  ),
                                },
                                'Đã cập nhật tên tài liệu.'
                              )
                            }
                            className="font-semibold text-sm text-white truncate"
                          />
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
                            {docItem.fileName && docItem.fileName !== docItem.title && (
                              <span className="truncate max-w-[220px]">{docItem.fileName}</span>
                            )}
                            {sizeLabel && <span className="font-mono-num">{sizeLabel}</span>}
                            {docItem.uploadedAt && <span className="font-mono-num">{docItem.uploadedAt}</span>}
                          </div>
                          {docItem.notes && (
                            <InlineEditableText
                              as="p"
                              multiline
                              collapsible={false}
                              allowEmpty
                              value={docItem.notes}
                              canEdit={editable}
                              label="Ghi chú tài liệu"
                              onSave={(val) =>
                                saveMemberPatch(
                                  {
                                    documents: memberDocuments.map((d) =>
                                      d.id === docItem.id ? { ...d, notes: val } : d
                                    ),
                                  },
                                  'Đã cập nhật ghi chú tài liệu.'
                                )
                              }
                              className="text-xs text-zinc-300 leading-relaxed pt-0.5"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {isExternalLink ? (
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#F02028]" />
                            <span>Mở tài liệu</span>
                          </a>
                        ) : (
                          <a
                            href={docItem.url}
                            download={docItem.fileName || docItem.title}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-white"
                          >
                            <Download className="w-3.5 h-3.5 text-[#F02028]" />
                            <span>Tải tài liệu</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            copyTextToClipboard(
                              docItem.notes ? `${docItem.title}\n${shareUrl}\n${docItem.notes}` : shareUrl,
                              `doc_${docItem.id}`,
                              'Đã sao chép tài liệu vào bộ nhớ tạm.'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#171719] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-white cursor-pointer"
                        >
                          {copiedId === `doc_${docItem.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Đã copy</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {editable && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSelfMemberProfile(
                                {
                                  ...member,
                                  documents: memberDocuments.filter((d) => d.id !== docItem.id),
                                },
                                `Đã xóa tài liệu "${docItem.title}".`
                              )
                            }
                            aria-label={`Xóa tài liệu ${docItem.title}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#171719] px-2.5 py-1.5 text-xs text-zinc-400 hover:border-[#F02028]/60 hover:text-[#F02028] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
