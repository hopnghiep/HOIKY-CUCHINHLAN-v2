import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  ImagePlus,
  Info,
  Link2,
  Play,
  Plus,
  Trash2,
  Upload,
  Youtube,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { AnthemYoutubeTrack, HeroGalleryPhoto, LeaderMessage, TimelineMilestone } from '../../types/memoir';
import { InlineEditableText } from '../common/InlineEditableText';
import { CollapsibleText } from '../common/CollapsibleText';
import { ResilientImage } from '../common/ResilientMedia';
import { HeroCoverSlideshow } from './HeroCoverSlideshow';
import { MemoirAnalyticsSection } from './MemoirAnalyticsSection';
import { computeMemoirStats } from '../../services/backupService';
import { uploadOrEncodeMedia } from '../../services/indexedDb';
import { extractYoutubeId, getYoutubeEmbedUrl } from '../../utils/youtube';

export function HomeView() {
  const { data, isAdmin, setActiveTab, updateData, notify } = useMemoir();

  const [addingYoutube, setAddingYoutube] = useState(false);
  const [ytTitle, setYtTitle] = useState('');
  const [ytAuthor, setYtAuthor] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [ytNotes, setYtNotes] = useState('');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editYtTitle, setEditYtTitle] = useState('');
  const [editYtAuthor, setEditYtAuthor] = useState('');
  const [editYtUrl, setEditYtUrl] = useState('');
  const [editYtNotes, setEditYtNotes] = useState('');
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [expandedTrackIds, setExpandedTrackIds] = useState<Record<string, boolean>>({});
  const [editingCoverUrl, setEditingCoverUrl] = useState(false);
  const [coverUrlDraft, setCoverUrlDraft] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  const [addingMilestone, setAddingMilestone] = useState(false);
  const [msYear, setMsYear] = useState('');
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');

  const [addingMessage, setAddingMessage] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgAuthor, setMsgAuthor] = useState('');
  const [msgRole, setMsgRole] = useState('Hiệu trưởng / Ban Giám hiệu');
  const [msgPeriod, setMsgPeriod] = useState('');
  const [msgContent, setMsgContent] = useState('');
  const [msgThumbnail, setMsgThumbnail] = useState('');
  const [uploadingNewMsgThumb, setUploadingNewMsgThumb] = useState(false);
  const [uploadingMsgThumbId, setUploadingMsgThumbId] = useState<string | null>(null);
  const [editingMsgThumbUrlId, setEditingMsgThumbUrlId] = useState<string | null>(null);
  const [msgThumbUrlDraft, setMsgThumbUrlDraft] = useState('');

  const anthemLyrics =
    typeof data.home.anthem.lyrics === 'string'
      ? data.home.anthem.lyrics
      : (data.home.anthem.sections || [])
          .map((s) => s.lyrics)
          .filter(Boolean)
          .join('\n\n');

  const stats = computeMemoirStats(data);
  const hasSampleData =
    data.home.dataOrigin === 'sample' ||
    data.members.some((m) => m.dataOrigin === 'sample') ||
    data.events.some((e) => e.dataOrigin === 'sample');

  const handleUpdateHeroSlides = (nextSlides: HeroGalleryPhoto[], toastMessage: string) => {
    updateData(
      (prev) => ({
        ...prev,
        home: {
          ...prev.home,
          dataOrigin: 'real',
          hero: {
            ...prev.home.hero,
            heroImage: nextSlides[0]?.url || '',
            galleryPhotos: nextSlides,
          },
        },
      }),
      toastMessage
    );
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msYear.trim() || !msTitle.trim()) return;
    const item: TimelineMilestone = {
      id: `ms_${Date.now()}`,
      year: msYear.trim(),
      title: msTitle.trim(),
      description: msDesc.trim(),
      orderIndex: data.milestones.length,
      dataOrigin: 'real',
    };
    updateData(
      (prev) => ({
        ...prev,
        milestones: [...prev.milestones, item],
      }),
      'Đã thêm mốc son mới.'
    );
    setMsYear('');
    setMsTitle('');
    setMsDesc('');
    setAddingMilestone(false);
  };

  const moveMilestone = (index: number, dir: -1 | 1) => {
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= data.milestones.length) return;
    updateData((prev) => {
      const list = [...prev.milestones];
      const [moved] = list.splice(index, 1);
      list.splice(nextIdx, 0, moved);
      return {
        ...prev,
        milestones: list.map((m, idx) => ({ ...m, orderIndex: idx })),
      };
    });
  };

  const handleAddLeaderMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgTitle.trim() || !msgAuthor.trim() || !msgContent.trim()) return;
    const msg: LeaderMessage = {
      id: `msg_${Date.now()}`,
      title: msgTitle.trim(),
      authorName: msgAuthor.trim(),
      authorRole: msgRole.trim(),
      period: msgPeriod.trim() || 'Thư gửi Chi đoàn',
      content: msgContent.trim(),
      ...(msgThumbnail.trim() ? { thumbnailImage: msgThumbnail.trim() } : {}),
      createdAt: new Date().toISOString().slice(0, 10),
      orderIndex: data.leaderMessages.length,
      dataOrigin: 'real',
    };
    updateData(
      (prev) => ({
        ...prev,
        leaderMessages: [...prev.leaderMessages, { ...msg, orderIndex: prev.leaderMessages.length }],
      }),
      'Đã thêm lời ngỏ mới.'
    );
    setMsgTitle('');
    setMsgAuthor('');
    setMsgPeriod('');
    setMsgContent('');
    setMsgThumbnail('');
    setAddingMessage(false);
  };

  const updateLeaderMessageThumbnail = (messageId: string, nextUrl: string, toastMessage: string) => {
    const cleaned = nextUrl.trim();
    updateData(
      (prev) => ({
        ...prev,
        leaderMessages: prev.leaderMessages.map((l) =>
          l.id === messageId
            ? { ...l, thumbnailImage: cleaned || '', dataOrigin: 'real' }
            : l
        ),
      }),
      toastMessage
    );
  };

  const handleUploadLeaderMessageThumb = async (messageId: string, file: File) => {
    setUploadingMsgThumbId(messageId);
    try {
      const res = await uploadOrEncodeMedia(file, 'image');
      updateLeaderMessageThumbnail(messageId, res.url, 'Đã tải lên và cập nhật ảnh thumbnail lời ngỏ.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể tải lên ảnh thumbnail.', 'error');
    } finally {
      setUploadingMsgThumbId(null);
    }
  };

  const moveLeaderMessage = (index: number, dir: -1 | 1) => {
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= data.leaderMessages.length) return;
    updateData(
      (prev) => {
        if (index < 0 || index >= prev.leaderMessages.length) return prev;
        const targetIdx = index + dir;
        if (targetIdx < 0 || targetIdx >= prev.leaderMessages.length) return prev;
        const list = [...prev.leaderMessages];
        const [moved] = list.splice(index, 1);
        list.splice(targetIdx, 0, moved);
        return {
          ...prev,
          leaderMessages: list.map((item, idx) => ({ ...item, orderIndex: idx })),
        };
      },
      'Đã cập nhật thứ tự thông điệp.'
    );
  };

  return (
    <div className="space-y-14 lg:space-y-20">
      {/* Sample vs Real Data Transparency Notice */}
      {data.settings.showSampleBanner && hasSampleData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#171719] px-5 py-3.5 text-xs text-zinc-300">
          <div className="flex items-start sm:items-center gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-[#F02028] mt-0.5 sm:mt-0" />
            <span>
              Đang hiển thị kèm <strong>tư liệu mẫu minh họa</strong> để trình bày bố cục kỷ yếu. Quản trị viên có
              thể chỉnh sửa trực tiếp hoặc xóa toàn bộ dữ liệu mẫu trong trang Quản trị để nhập tư liệu thật.
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="shrink-0 text-xs font-semibold text-[#F02028] hover:underline cursor-pointer"
            >
              Mở Admin Console →
            </button>
          )}
        </div>
      )}

      {/* A. HERO SECTION — Corporate Editorial 12-Column Split */}
      <section
        id="home-hero"
        className="corp-hero-sheet editorial-open-section relative overflow-hidden scroll-mt-32 rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-10 lg:p-12"
      >
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <InlineEditableText
                as="div"
                label="Nhãn không gian hồi ký"
                value={data.home.hero.spaceLabel}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, spaceLabel: val } },
                    }),
                    'Đã cập nhật nhãn không gian hồi ký.'
                  )
                }
                className="text-xs font-medium tracking-[0.14em] uppercase text-[#F02028]"
              />

              <InlineEditableText
                as="h1"
                label="Tiêu đề chính"
                value={data.home.hero.title}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, title: val } },
                    }),
                    'Đã cập nhật tiêu đề chính.'
                  )
                }
                className="font-display editorial-hero-title text-3xl sm:text-5xl lg:text-[3.5rem] font-semibold leading-[1.1] tracking-tight text-white text-balance"
              />

              <InlineEditableText
                as="p"
                label="Đơn vị trực thuộc"
                value={data.home.hero.unitIntro}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, unitIntro: val } },
                    }),
                    'Đã cập nhật tên đơn vị.'
                  )
                }
                className="font-editorial-serif text-lg sm:text-2xl italic font-medium text-zinc-200 leading-snug"
              />

              <InlineEditableText
                as="p"
                multiline
                label="Mô tả mở đầu"
                value={data.home.hero.subtitle}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: { ...prev.home, dataOrigin: 'real', hero: { ...prev.home.hero, subtitle: val } },
                    }),
                    'Đã cập nhật phần giới thiệu.'
                  )
                }
                className="max-w-xl text-sm sm:text-[15px] leading-relaxed text-zinc-300"
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroCoverSlideshow
              heroImage={data.home.hero.heroImage}
              galleryPhotos={data.home.hero.galleryPhotos}
              isAdmin={isAdmin}
              onUpdateSlides={handleUpdateHeroSlides}
              onNotify={notify}
            />
          </div>
        </div>

        {/* Full-Width Quantitative Archive Strip */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <div className="text-xs text-zinc-400">Đoàn viên Chi đoàn</div>
            <div className="mt-1 font-mono-num text-2xl font-semibold text-white">{stats.membersCount}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Khách mời / Người có liên quan</div>
            <div className="mt-1 font-mono-num text-2xl font-semibold text-white">{stats.guestsCount}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Sự kiện & Hoạt động</div>
            <div className="mt-1 font-mono-num text-2xl font-semibold text-white">{stats.eventsCount}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Hình ảnh & Bài viết</div>
            <div className="mt-1 font-mono-num text-2xl font-semibold text-white">
              {stats.imagesCount} ảnh · {stats.articlesCount} bài
            </div>
          </div>
        </div>
      </section>

      {/* A2. REAL-DATA CORPORATE INFOGRAPHIC & ARCHIVE ANALYTICS */}
      <MemoirAnalyticsSection />

      {/* B. LỊCH SỬ HÌNH THÀNH — Crisp Corporate White Sheet */}
      <section
        id="home-history"
        className="corp-white-band editorial-cream-sheet scroll-mt-32 rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-10 lg:p-12 space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-zinc-400">
              <InlineEditableText
                as="span"
                label="Nhãn mục Lịch sử"
                value={data.home.history.sectionLabel || '01 · Biên niên sử'}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: {
                        ...prev.home,
                        dataOrigin: 'real',
                        history: { ...prev.home.history, sectionLabel: val },
                      },
                    }),
                    'Đã cập nhật nhãn mục Lịch sử.'
                  )
                }
                className="text-xs font-medium text-zinc-400"
              />
              <span aria-hidden="true">·</span>
              <span>{data.home.dataOrigin === 'sample' ? 'Dữ liệu mẫu minh họa' : 'Tư liệu chính thức'}</span>
            </div>
            <InlineEditableText
              as="h2"
              label="Tiêu đề mục Lịch sử"
              value={data.home.history.sectionTitle || 'Lịch sử hình thành'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      history: { ...prev.home.history, sectionTitle: val },
                    },
                  }),
                  'Đã cập nhật tiêu đề mục Lịch sử.'
                )
              }
              className="font-display editorial-section-title text-2xl sm:text-3xl font-semibold text-white text-balance"
            />
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      history: {
                        ...prev.home.history,
                        stages: [
                          ...prev.home.history.stages,
                          {
                            id: `stage_${Date.now()}`,
                            period: 'Giai đoạn mới',
                            title: 'Tiêu đề giai đoạn phát triển',
                            description: 'Mô tả các hoạt động và dấu ấn trong giai đoạn này.',
                          },
                        ],
                      },
                    },
                  }),
                  'Đã thêm giai đoạn phát triển mới.'
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#F02028]" />
              Thêm giai đoạn
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <InlineEditableText
              as="h3"
              label="Tiêu đề lịch sử"
              value={data.home.history.foundingTitle}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', history: { ...prev.home.history, foundingTitle: val } },
                  }),
                  'Đã cập nhật tiêu đề lịch sử.'
                )
              }
              className="text-lg font-semibold text-white"
            />
            <InlineEditableText
              as="p"
              multiline
              collapsedLines={3}
              label="Quá trình thành lập"
              value={data.home.history.foundingContent}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', history: { ...prev.home.history, foundingContent: val } },
                  }),
                  'Đã cập nhật nội dung lịch sử thành lập.'
                )
              }
              className="text-sm leading-relaxed text-zinc-300"
            />

            <div className="pt-4 border-t border-white/10 space-y-2">
              <InlineEditableText
                as="div"
                label="Tiêu đề dấu ấn & thành tựu"
                value={data.home.history.achievementsTitle || 'Những dấu ấn và thành tựu'}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: {
                        ...prev.home,
                        dataOrigin: 'real',
                        history: { ...prev.home.history, achievementsTitle: val },
                      },
                    }),
                    'Đã cập nhật tiêu đề dấu ấn và thành tựu.'
                  )
                }
                className="text-xs font-semibold uppercase tracking-wider text-zinc-400"
              />
              <InlineEditableText
                as="p"
                multiline
                label="Thành tựu nổi bật"
                value={data.home.history.achievementsSummary}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: {
                        ...prev.home,
                        dataOrigin: 'real',
                        history: { ...prev.home.history, achievementsSummary: val },
                      },
                    }),
                    'Đã cập nhật phần dấu ấn và thành tựu.'
                  )
                }
                className="text-sm leading-relaxed text-zinc-300"
              />
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 gap-4">
            {data.home.history.stages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/60 p-8 text-center text-sm text-zinc-400">
                Chưa có giai đoạn phát triển nào. Quản trị viên có thể nhấn “Thêm giai đoạn” để bổ sung.
              </div>
            ) : (
              data.home.history.stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="rounded-2xl border border-white/10 bg-[#242428] p-5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <InlineEditableText
                      as="div"
                      label={`Thời kỳ giai đoạn ${idx + 1}`}
                      value={stage.period}
                      onSave={(val) =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            home: {
                              ...prev.home,
                              dataOrigin: 'real',
                              history: {
                                ...prev.home.history,
                                stages: prev.home.history.stages.map((s) =>
                                  s.id === stage.id ? { ...s, period: val } : s
                                ),
                              },
                            },
                          }),
                          'Đã cập nhật thời kỳ giai đoạn.'
                        )
                      }
                      className="text-xs font-semibold text-[#F02028]"
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          updateData(
                            (prev) => ({
                              ...prev,
                              home: {
                                ...prev.home,
                                history: {
                                  ...prev.home.history,
                                  stages: prev.home.history.stages.filter((s) => s.id !== stage.id),
                                },
                              },
                            }),
                            'Đã xóa giai đoạn.'
                          )
                        }
                        aria-label="Xóa giai đoạn"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <InlineEditableText
                    as="h3"
                    label={`Tiêu đề giai đoạn ${idx + 1}`}
                    value={stage.title}
                    onSave={(val) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            history: {
                              ...prev.home.history,
                              stages: prev.home.history.stages.map((s) =>
                                s.id === stage.id ? { ...s, title: val } : s
                              ),
                            },
                          },
                        }),
                        'Đã cập nhật tiêu đề giai đoạn.'
                      )
                    }
                    className="text-base font-semibold text-white"
                  />

                  <InlineEditableText
                    as="p"
                    multiline
                    label={`Mô tả giai đoạn ${idx + 1}`}
                    value={stage.description}
                    onSave={(val) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            history: {
                              ...prev.home.history,
                              stages: prev.home.history.stages.map((s) =>
                                s.id === stage.id ? { ...s, description: val } : s
                              ),
                            },
                          },
                        }),
                        'Đã cập nhật mô tả giai đoạn.'
                      )
                    }
                    className="text-sm text-zinc-300 leading-relaxed"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* C. Ý NGHĨA VÀ MỤC TIÊU — Deep Navy Alternating Executive Band */}
      <section
        id="home-meaning"
        className="corp-navy-band editorial-open-section relative overflow-hidden scroll-mt-32 rounded-3xl border border-white/10 border-t bg-[#171719] p-6 sm:p-10 lg:p-12 space-y-8"
      >
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 border-b border-white/10 pb-8 items-end">
          <div className="lg:col-span-5 space-y-2">
            <InlineEditableText
              as="div"
              label="Nhãn mục Ý nghĩa"
              value={data.home.meaning.sectionLabel || '02 · Sứ mệnh lưu giữ ký ức'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, sectionLabel: val },
                    },
                  }),
                  'Đã cập nhật nhãn mục Ý nghĩa.'
                )
              }
              className="text-xs font-medium tracking-[0.12em] uppercase text-zinc-400"
            />
            <InlineEditableText
              as="h2"
              label="Tiêu đề mục Ý nghĩa"
              value={data.home.meaning.sectionTitle || 'Ý nghĩa và mục tiêu'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, sectionTitle: val },
                    },
                  }),
                  'Đã cập nhật tiêu đề mục Ý nghĩa.'
                )
              }
              className="font-display editorial-section-title text-2xl sm:text-3xl font-semibold text-white"
            />
          </div>
          <div className="lg:col-span-7">
            <InlineEditableText
              as="p"
              multiline
              label="Giới thiệu ý nghĩa"
              value={data.home.meaning.introContent}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', meaning: { ...prev.home.meaning, introContent: val } },
                  }),
                  'Đã cập nhật phần giới thiệu ý nghĩa.'
                )
              }
              className="font-editorial-serif text-base sm:text-xl italic text-zinc-200 leading-relaxed"
            />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="editorial-subcard rounded-2xl border border-white/10 bg-[#242428] p-6 sm:p-7 space-y-3">
            <InlineEditableText
              as="div"
              label="Tiêu đề Giá trị truyền thống"
              value={data.home.meaning.traditionalValuesTitle || 'Giá trị truyền thống'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, traditionalValuesTitle: val },
                    },
                  }),
                  'Đã cập nhật tiêu đề Giá trị truyền thống.'
                )
              }
              className="text-xs font-medium text-[#F02028]"
            />
            <InlineEditableText
              as="p"
              multiline
              label="Giá trị truyền thống"
              value={data.home.meaning.traditionalValues}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, traditionalValues: val },
                    },
                  }),
                  'Đã cập nhật giá trị truyền thống.'
                )
              }
              className="text-sm text-zinc-300 leading-relaxed"
            />
          </div>

          <div className="editorial-subcard rounded-2xl border border-white/10 bg-[#242428] p-6 sm:p-7 space-y-3">
            <InlineEditableText
              as="div"
              label="Tiêu đề Mục tiêu xây dựng hồi ký"
              value={data.home.meaning.memoirGoalsTitle || 'Mục tiêu xây dựng hồi ký'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, memoirGoalsTitle: val },
                    },
                  }),
                  'Đã cập nhật tiêu đề Mục tiêu xây dựng hồi ký.'
                )
              }
              className="text-xs font-medium text-[#F02028]"
            />
            <InlineEditableText
              as="p"
              multiline
              label="Mục tiêu hồi ký"
              value={data.home.meaning.memoirGoals}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', meaning: { ...prev.home.meaning, memoirGoals: val } },
                  }),
                  'Đã cập nhật mục tiêu hồi ký.'
                )
              }
              className="text-sm text-zinc-300 leading-relaxed"
            />
          </div>

          <div className="editorial-subcard rounded-2xl border border-white/10 bg-[#242428] p-6 sm:p-7 space-y-3">
            <InlineEditableText
              as="div"
              label="Tiêu đề Giá trị kết nối các thế hệ"
              value={data.home.meaning.generationalConnectionTitle || 'Giá trị kết nối các thế hệ'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, generationalConnectionTitle: val },
                    },
                  }),
                  'Đã cập nhật tiêu đề Giá trị kết nối các thế hệ.'
                )
              }
              className="text-xs font-medium text-[#F02028]"
            />
            <InlineEditableText
              as="p"
              multiline
              label="Kết nối thế hệ"
              value={data.home.meaning.generationalConnection}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      meaning: { ...prev.home.meaning, generationalConnection: val },
                    },
                  }),
                  'Đã cập nhật giá trị kết nối thế hệ.'
                )
              }
              className="text-sm text-zinc-300 leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* D. MỐC SON VÀ SỰ KIỆN QUAN TRỌNG — Crisp White Sheet */}
      <section
        id="home-milestones"
        className="corp-white-band editorial-cream-sheet scroll-mt-32 rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-10 lg:p-12 space-y-7"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1 flex-1 min-w-0">
            <InlineEditableText
              as="div"
              label="Nhãn mục Mốc son"
              value={data.home.milestonesLabel || '03 · Dòng thời gian lưu niệm'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', milestonesLabel: val },
                  }),
                  'Đã cập nhật nhãn mục Mốc son.'
                )
              }
              className="text-xs font-medium text-zinc-400"
            />
            <InlineEditableText
              as="h2"
              label="Tiêu đề mục Mốc son"
              value={data.home.milestonesTitle || 'Mốc son và sự kiện quan trọng'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', milestonesTitle: val },
                  }),
                  'Đã cập nhật tiêu đề mục Mốc son.'
                )
              }
              className="font-display editorial-section-title text-2xl sm:text-3xl font-semibold text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAddingMilestone((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#F02028]" />
                Thêm mốc son
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors cursor-pointer"
            >
              <span>Xem toàn bộ sự kiện</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {isAdmin && addingMilestone && (
          <form
            onSubmit={handleAddMilestone}
            className="rounded-2xl border border-[#F02028]/50 bg-[#242428] p-5 space-y-3"
          >
            <div className="text-sm font-semibold text-white">Thêm mốc son lịch sử mới</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={msYear}
                onChange={(e) => setMsYear(e.target.value)}
                required
                placeholder="Năm / Thời kỳ (VD: 1998)"
                className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
              <input
                type="text"
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                required
                placeholder="Tiêu đề mốc son"
                className="sm:col-span-2 rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <textarea
              value={msDesc}
              onChange={(e) => setMsDesc(e.target.value)}
              rows={2}
              placeholder="Mô tả ý nghĩa sự kiện..."
              className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddingMilestone(false)}
                className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs text-zinc-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Lưu mốc son
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {data.milestones.length === 0 ? (
            <div className="md:col-span-3 rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-8 text-center text-sm text-zinc-400">
              Chưa có mốc son nào được ghi nhận.
            </div>
          ) : (
            data.milestones.map((ms, index) => (
              <article
                key={ms.id}
                className="rounded-2xl border border-white/10 bg-[#242428] p-6 flex flex-col justify-between gap-4 hover:border-white/20 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                    <InlineEditableText
                      as="span"
                      label="Năm mốc son"
                      value={ms.year}
                      onSave={(val) =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            milestones: prev.milestones.map((item) =>
                              item.id === ms.id ? { ...item, year: val, dataOrigin: 'real' } : item
                            ),
                          }),
                          'Đã cập nhật năm mốc son.'
                        )
                      }
                      className="font-mono-num font-semibold text-[#F02028]"
                    />
                    {ms.dataOrigin === 'sample' && <span>Mẫu minh họa</span>}
                  </div>

                  <InlineEditableText
                    as="h3"
                    label="Tiêu đề mốc son"
                    value={ms.title}
                    onSave={(val) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((item) =>
                            item.id === ms.id ? { ...item, title: val, dataOrigin: 'real' } : item
                          ),
                        }),
                        'Đã cập nhật tiêu đề mốc son.'
                      )
                    }
                    className="text-base font-semibold text-white"
                  />

                  <InlineEditableText
                    as="p"
                    multiline
                    label="Mô tả mốc son"
                    value={ms.description}
                    onSave={(val) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          milestones: prev.milestones.map((item) =>
                            item.id === ms.id ? { ...item, description: val, dataOrigin: 'real' } : item
                          ),
                        }),
                        'Đã cập nhật mô tả mốc son.'
                      )
                    }
                    className="text-sm text-zinc-300 leading-relaxed"
                  />
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => moveMilestone(index, -1)}
                      disabled={index === 0}
                      title="Đưa lên trước"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMilestone(index, 1)}
                      disabled={index === data.milestones.length - 1}
                      title="Đưa xuống sau"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateData(
                          (prev) => ({
                            ...prev,
                            milestones: prev.milestones.filter((item) => item.id !== ms.id),
                          }),
                          'Đã xóa mốc son.'
                        )
                      }
                      title="Xóa mốc son"
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {/* E. HÀNH KHÚC CHI ĐOÀN — Structured White Media/Lyrics Spread */}
      <section
        id="home-anthem"
        className="corp-white-band editorial-open-section scroll-mt-32 rounded-3xl border border-white/10 border-t bg-[#171719] p-6 sm:p-10 lg:p-12 space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-2 flex-1 min-w-0">
            <InlineEditableText
              as="div"
              label="Nhãn mục Âm vang truyền thống"
              value={data.home.anthem.sectionLabel || '04 · Âm vang truyền thống'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: {
                      ...prev.home,
                      dataOrigin: 'real',
                      anthem: { ...prev.home.anthem, sectionLabel: val },
                    },
                  }),
                  'Đã cập nhật nhãn mục Âm vang truyền thống.'
                )
              }
              className="text-xs font-medium tracking-[0.12em] uppercase text-zinc-400"
            />
            <InlineEditableText
              as="h2"
              label="Tiêu đề bài ca"
              value={data.home.anthem.title}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', anthem: { ...prev.home.anthem, title: val } },
                  }),
                  'Đã cập nhật tên bài ca.'
                )
              }
              className="font-display editorial-section-title text-2xl sm:text-3xl font-semibold text-white"
            />
            <InlineEditableText
              as="p"
              label="Tên tác giả"
              value={data.home.anthem.authorName || 'Tác giả: Đang cập nhật'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', anthem: { ...prev.home.anthem, authorName: val } },
                  }),
                  'Đã cập nhật tên tác giả.'
                )
              }
              className="font-editorial-serif text-base sm:text-lg italic font-medium text-[#F02028]"
            />
            <InlineEditableText
              as="p"
              label="Thông tin sáng tác"
              value={data.home.anthem.composerInfo}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', anthem: { ...prev.home.anthem, composerInfo: val } },
                  }),
                  'Đã cập nhật thông tin sáng tác.'
                )
              }
              className="text-sm text-zinc-400"
            />
            <InlineEditableText
              as="p"
              multiline
              label="Nội dung liên quan"
              value={
                data.home.anthem.relatedInfo ||
                'Lưu giữ lời bài hát, hoàn cảnh sáng tác và các ca khúc do đoàn viên sáng tác.'
              }
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', anthem: { ...prev.home.anthem, relatedInfo: val } },
                  }),
                  'Đã cập nhật nội dung liên quan.'
                )
              }
              className="text-sm text-zinc-300 leading-relaxed max-w-3xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cover Image + Upload/URL Controls */}
          <div className="lg:col-span-4 space-y-3">
            <div className="editorial-photo-frame overflow-hidden rounded-2xl border border-white/10 bg-[#242428] aspect-[4/3]">
              <ResilientImage
                src={data.home.anthem.coverImage}
                alt={`Ảnh bìa ${data.home.anthem.title}`}
                downloadFileName={`anh-bia-${data.home.anthem.title || 'bai-ca-truyen-thong'}`}
                viewerSubtitle="Ảnh cover Bài ca truyền thống"
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

            {isAdmin && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingCover ? 'Đang tải...' : 'Tải ảnh cover'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingCover(true);
                        try {
                          const res = await uploadOrEncodeMedia(file, 'image');
                          updateData(
                            (prev) => ({
                              ...prev,
                              home: {
                                ...prev.home,
                                dataOrigin: 'real',
                                anthem: { ...prev.home.anthem, coverImage: res.url },
                              },
                            }),
                            'Đã cập nhật ảnh cover bài ca.'
                          );
                        } catch (err) {
                          notify(err instanceof Error ? err.message : 'Không thể tải ảnh cover.', 'error');
                        } finally {
                          setUploadingCover(false);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverUrlDraft(data.home.anthem.coverImage);
                      setEditingCoverUrl((v) => !v);
                    }}
                    className="rounded-xl border border-white/15 bg-[#242428] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 cursor-pointer"
                  >
                    Nhập link ảnh
                  </button>
                </div>

                {editingCoverUrl && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={coverUrlDraft}
                      onChange={(e) => setCoverUrlDraft(e.target.value)}
                      placeholder="Dán đường dẫn ảnh cover..."
                      className="flex-1 rounded-lg border border-white/15 bg-[#242428] px-2.5 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (coverUrlDraft.trim()) {
                          updateData(
                            (prev) => ({
                              ...prev,
                              home: {
                                ...prev.home,
                                dataOrigin: 'real',
                                anthem: { ...prev.home.anthem, coverImage: coverUrlDraft.trim() },
                              },
                            }),
                            'Đã cập nhật đường dẫn ảnh cover.'
                          );
                        }
                        setEditingCoverUrl(false);
                      }}
                      className="rounded-lg bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      Lưu
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Single Collapsible Lyrics Field */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-white/10 bg-[#242428] p-5 sm:p-6 space-y-3">
              <InlineEditableText
                as="div"
                label="Nhãn khung lời bài hát"
                value={data.home.anthem.lyricsLabel || 'Lời bài hát'}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
                      ...prev,
                      home: {
                        ...prev.home,
                        dataOrigin: 'real',
                        anthem: { ...prev.home.anthem, lyricsLabel: val },
                      },
                    }),
                    'Đã cập nhật tiêu đề khung lời bài hát.'
                  )
                }
                className="text-xs font-semibold uppercase tracking-wider text-[#F02028]"
              />

              <InlineEditableText
                as="div"
                multiline
                collapsible
                collapsedLines={6}
                textareaRows={12}
                label="Lời bài hát"
                placeholder="Nhập lời bài hát tại đây..."
                value={anthemLyrics || 'Chưa có lời bài hát. Quản trị viên có thể nhấn trực tiếp để nhập lời.'}
                onSave={(val) =>
                  updateData(
                    (prev) => ({
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
                    }),
                    'Đã cập nhật lời bài hát.'
                  )
                }
                className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* YouTube Links for Member Compositions */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Youtube className="w-5 h-5 text-[#F02028] shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <InlineEditableText
                    as="h3"
                    inline
                    label="Tiêu đề mục YouTube bài ca"
                    value={data.home.anthem.youtubeSectionTitle || 'Ca khúc do Đoàn viên sáng tác trên YouTube'}
                    onSave={(val) =>
                      updateData(
                        (prev) => ({
                          ...prev,
                          home: {
                            ...prev.home,
                            dataOrigin: 'real',
                            anthem: { ...prev.home.anthem, youtubeSectionTitle: val },
                          },
                        }),
                        'Đã cập nhật tiêu đề danh sách YouTube.'
                      )
                    }
                    className="text-base font-semibold text-white"
                  />
                  <span className="text-xs font-mono-num text-zinc-400">
                    ({(data.home.anthem.youtubeTracks || []).length})
                  </span>
                </div>
                <InlineEditableText
                  as="p"
                  label="Mô tả mục YouTube bài ca"
                  value={
                    data.home.anthem.youtubeSectionSubtitle ||
                    'Liên kết các bản thu âm, video ca nhạc sáng tác bởi các thế hệ đoàn viên Chi đoàn.'
                  }
                  onSave={(val) =>
                    updateData(
                      (prev) => ({
                        ...prev,
                        home: {
                          ...prev.home,
                          dataOrigin: 'real',
                          anthem: { ...prev.home.anthem, youtubeSectionSubtitle: val },
                        },
                      }),
                      'Đã cập nhật mô tả danh sách YouTube.'
                    )
                  }
                  className="text-xs text-zinc-400"
                />
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setAddingYoutube((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm link YouTube</span>
              </button>
            )}
          </div>

          {isAdmin && addingYoutube && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ytTitle.trim() || !ytUrl.trim()) return;
                const newTrack: AnthemYoutubeTrack = {
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
                        youtubeTracks: [...(prev.home.anthem.youtubeTracks || []), newTrack],
                      },
                    },
                  }),
                  `Đã thêm liên kết YouTube "${newTrack.title}".`
                );
                setYtTitle('');
                setYtAuthor('');
                setYtUrl('');
                setYtNotes('');
                setAddingYoutube(false);
              }}
              className="rounded-2xl border border-[#F02028]/50 bg-[#242428] p-5 space-y-3"
            >
              <div className="text-sm font-semibold text-white">Thêm bài nhạc YouTube do đoàn viên sáng tác</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                  required
                  placeholder="Tên bài nhạc *"
                  className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
                <input
                  type="text"
                  value={ytAuthor}
                  onChange={(e) => setYtAuthor(e.target.value)}
                  placeholder="Tên tác giả / Đoàn viên sáng tác"
                  className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
                <input
                  type="url"
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  required
                  placeholder="Link YouTube (https://youtube.com/... hoặc youtu.be/...)"
                  className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={ytNotes}
                onChange={(e) => setYtNotes(e.target.value)}
                placeholder="Ghi chú liên quan (năm sáng tác, dịp biểu diễn, kỷ niệm...)"
                className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingYoutube(false)}
                  className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs text-zinc-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  Lưu link YouTube
                </button>
              </div>
            </form>
          )}

          {(data.home.anthem.youtubeTracks || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-6 text-center text-xs text-zinc-400">
              Chưa có bài nhạc YouTube nào được liên kết.{' '}
              {isAdmin ? 'Nhấn "Thêm link YouTube" để gắn các sáng tác của đoàn viên.' : ''}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              {(data.home.anthem.youtubeTracks || []).map((track) => {
                const videoId = extractYoutubeId(track.youtubeUrl);
                const embedUrl = getYoutubeEmbedUrl(track.youtubeUrl);
                const isPlaying = activeEmbedId === track.id;
                const isExpanded = Boolean(expandedTrackIds[track.id]) || editingTrackId === track.id;
                const thumbUrl = videoId
                  ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                  : data.home.anthem.coverImage;

                const toggleExpandTrack = () => {
                  setExpandedTrackIds((prev) => {
                    const nextExpanded = !prev[track.id];
                    if (!nextExpanded && activeEmbedId === track.id) {
                      setActiveEmbedId(null);
                    }
                    return { ...prev, [track.id]: nextExpanded };
                  });
                };

                const startPlayTrack = () => {
                  setExpandedTrackIds((prev) => ({ ...prev, [track.id]: true }));
                  setActiveEmbedId(track.id);
                };

                const startEditTrack = () => {
                  setExpandedTrackIds((prev) => ({ ...prev, [track.id]: true }));
                  setEditingTrackId(track.id);
                  setEditYtTitle(track.title);
                  setEditYtAuthor(track.author);
                  setEditYtUrl(track.youtubeUrl);
                  setEditYtNotes(track.notes || '');
                };

                if (!isExpanded) {
                  return (
                    <article
                      key={track.id}
                      className="rounded-2xl border border-white/10 bg-[#242428] p-3.5 space-y-2.5 transition-colors hover:border-white/25"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-24 aspect-video shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#171719]">
                          <ResilientImage
                            src={thumbUrl}
                            alt={track.title}
                            downloadFileName={track.title}
                            viewerSubtitle={track.author}
                            hideCornerButton
                            className="h-full w-full object-cover"
                          />
                          {embedUrl && (
                            <button
                              type="button"
                              onClick={startPlayTrack}
                              aria-label={`Phát ${track.title}`}
                              title="Mở rộng và phát video"
                              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/25 transition-colors cursor-pointer"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F02028] text-white shadow">
                                <Play className="w-3.5 h-3.5 ml-0.5" />
                              </span>
                            </button>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <h4 className="text-sm font-semibold text-white truncate" title={track.title}>
                            {track.title}
                          </h4>
                          <div className="text-xs text-[#F02028] truncate" title={track.author}>
                            {track.author}
                          </div>
                          {track.notes && (
                            <p className="text-[11px] text-zinc-400 truncate" title={track.notes}>
                              {track.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={toggleExpandTrack}
                          aria-expanded={false}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171719] px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-white cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-[#F02028]" />
                          <span>Mở rộng</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={startEditTrack}
                                aria-label="Sửa bài nhạc và link YouTube"
                                title="Sửa thông tin & Link YouTube"
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
                                    'Đã xóa liên kết YouTube.'
                                  )
                                }
                                aria-label="Xóa bài nhạc"
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <a
                            href={track.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Mở trên YouTube"
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171719] px-2 py-1 text-[11px] text-zinc-300 hover:text-white"
                          >
                            <span>YouTube</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                }

                return (
                  <article
                    key={track.id}
                    className="overflow-hidden rounded-2xl border border-[#F02028]/40 bg-[#242428] flex flex-col justify-between"
                  >
                    {embedUrl && isPlaying ? (
                      <div className="aspect-video w-full bg-black">
                        <iframe
                          src={`${embedUrl}?autoplay=1`}
                          title={track.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full border-0"
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-video w-full bg-[#171719]">
                        <ResilientImage
                          src={thumbUrl}
                          alt={track.title}
                          downloadFileName={track.title}
                          viewerSubtitle={track.author}
                          className="h-full w-full object-cover"
                        />
                        {embedUrl && (
                          <button
                            type="button"
                            onClick={() => setActiveEmbedId(track.id)}
                            aria-label={`Phát ${track.title}`}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/25 transition-colors cursor-pointer"
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F02028] text-white shadow-lg">
                              <Play className="w-5 h-5 ml-0.5" />
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="p-4 space-y-2.5">
                      {isAdmin && editingTrackId === track.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!editYtTitle.trim() || !editYtUrl.trim()) return;
                            updateData(
                              (prev) => ({
                                ...prev,
                                home: {
                                  ...prev.home,
                                  dataOrigin: 'real',
                                  anthem: {
                                    ...prev.home.anthem,
                                    youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                      t.id === track.id
                                        ? {
                                            ...t,
                                            title: editYtTitle.trim(),
                                            author: editYtAuthor.trim() || 'Đoàn viên Chi đoàn Cù Chính Lan',
                                            youtubeUrl: editYtUrl.trim(),
                                            notes: editYtNotes.trim(),
                                          }
                                        : t
                                    ),
                                  },
                                },
                              }),
                              `Đã cập nhật bài nhạc "${editYtTitle.trim()}".`
                            );
                            setEditingTrackId(null);
                          }}
                          className="space-y-2.5 rounded-xl border border-[#F02028]/50 bg-[#171719] p-3"
                        >
                          <div className="text-[11px] font-medium text-[#F02028]">Chỉnh sửa bài nhạc YouTube</div>
                          <input
                            type="text"
                            value={editYtTitle}
                            onChange={(e) => setEditYtTitle(e.target.value)}
                            required
                            placeholder="Tên bài nhạc *"
                            className="w-full rounded-lg border border-white/10 bg-[#242428] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editYtAuthor}
                            onChange={(e) => setEditYtAuthor(e.target.value)}
                            placeholder="Tên tác giả"
                            className="w-full rounded-lg border border-white/10 bg-[#242428] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                          />
                          <input
                            type="url"
                            value={editYtUrl}
                            onChange={(e) => setEditYtUrl(e.target.value)}
                            required
                            placeholder="Link YouTube *"
                            className="w-full rounded-lg border border-white/10 bg-[#242428] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={editYtNotes}
                            onChange={(e) => setEditYtNotes(e.target.value)}
                            placeholder="Ghi chú liên quan..."
                            className="w-full rounded-lg border border-white/10 bg-[#242428] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingTrackId(null)}
                              className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] text-zinc-300 cursor-pointer"
                            >
                              Hủy
                            </button>
                            <button
                              type="submit"
                              className="rounded-lg bg-[#F02028] px-3 py-1 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              Lưu
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <InlineEditableText
                                as="h4"
                                label="Tên bài nhạc"
                                value={track.title}
                                onSave={(val) =>
                                  updateData(
                                    (prev) => ({
                                      ...prev,
                                      home: {
                                        ...prev.home,
                                        dataOrigin: 'real',
                                        anthem: {
                                          ...prev.home.anthem,
                                          youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                            t.id === track.id ? { ...t, title: val } : t
                                          ),
                                        },
                                      },
                                    }),
                                    'Đã cập nhật tên bài nhạc.'
                                  )
                                }
                                className="font-semibold text-white"
                              />
                              <InlineEditableText
                                as="div"
                                label="Tác giả bài nhạc"
                                value={track.author}
                                onSave={(val) =>
                                  updateData(
                                    (prev) => ({
                                      ...prev,
                                      home: {
                                        ...prev.home,
                                        dataOrigin: 'real',
                                        anthem: {
                                          ...prev.home.anthem,
                                          youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                            t.id === track.id ? { ...t, author: val } : t
                                          ),
                                        },
                                      },
                                    }),
                                    'Đã cập nhật tác giả bài nhạc.'
                                  )
                                }
                                className="text-xs text-[#F02028]"
                              />
                            </div>
                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={startEditTrack}
                                  aria-label="Sửa bài nhạc và link YouTube"
                                  title="Sửa thông tin & Link YouTube"
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
                                      'Đã xóa liên kết YouTube.'
                                    )
                                  }
                                  aria-label="Xóa bài nhạc"
                                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {track.notes ? (
                            <InlineEditableText
                              as="p"
                              multiline
                              collapsedLines={2}
                              label="Ghi chú bài nhạc"
                              value={track.notes}
                              onSave={(val) =>
                                updateData(
                                  (prev) => ({
                                    ...prev,
                                    home: {
                                      ...prev.home,
                                      dataOrigin: 'real',
                                      anthem: {
                                        ...prev.home.anthem,
                                        youtubeTracks: (prev.home.anthem.youtubeTracks || []).map((t) =>
                                          t.id === track.id ? { ...t, notes: val } : t
                                        ),
                                      },
                                    },
                                  }),
                                  'Đã cập nhật ghi chú bài nhạc.'
                                )
                              }
                              className="text-xs text-zinc-300 leading-relaxed"
                            />
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={startEditTrack}
                              className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                            >
                              + Thêm ghi chú / chỉnh link YouTube
                            </button>
                          ) : null}
                        </>
                      )}
                      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={toggleExpandTrack}
                            aria-expanded={true}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#171719] px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-white cursor-pointer"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-[#F02028]" />
                            <span>Thu nhỏ</span>
                          </button>
                          {embedUrl && !isPlaying ? (
                            <button
                              type="button"
                              onClick={() => setActiveEmbedId(track.id)}
                              className="text-xs font-semibold text-white hover:text-[#F02028] cursor-pointer"
                            >
                              Phát tại đây
                            </button>
                          ) : null}
                        </div>
                        <a
                          href={track.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-zinc-300 hover:text-white"
                        >
                          <span>Mở YouTube</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* F. LỜI NGỎ CỦA HIỆU TRƯỞNG & LÃNH ĐẠO — Crisp White Editorial Sheet */}
      <section
        id="home-messages"
        className="corp-white-band editorial-cream-sheet scroll-mt-32 rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-10 lg:p-12 space-y-7"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div className="space-y-1 flex-1 min-w-0">
            <InlineEditableText
              as="div"
              label="Nhãn mục Thông điệp"
              value={data.home.messagesLabel || '05 · Thông điệp & Tri ân'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', messagesLabel: val },
                  }),
                  'Đã cập nhật nhãn mục Thông điệp.'
                )
              }
              className="text-xs font-medium tracking-[0.12em] uppercase text-zinc-400"
            />
            <InlineEditableText
              as="h2"
              label="Tiêu đề mục Thông điệp"
              value={data.home.messagesTitle || 'Lời ngỏ của Hiệu trưởng và Các thế hệ lãnh đạo'}
              onSave={(val) =>
                updateData(
                  (prev) => ({
                    ...prev,
                    home: { ...prev.home, dataOrigin: 'real', messagesTitle: val },
                  }),
                  'Đã cập nhật tiêu đề mục Thông điệp.'
                )
              }
              className="font-display editorial-section-title text-2xl sm:text-3xl font-semibold text-white"
            />
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setAddingMessage((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm lời ngỏ / thông điệp
            </button>
          )}
        </div>

        {isAdmin && addingMessage && (
          <form
            onSubmit={handleAddLeaderMessage}
            className="rounded-2xl border border-[#F02028]/50 bg-[#242428] p-5 space-y-3"
          >
            <div className="text-sm font-semibold text-white">Thêm lời ngỏ / thông điệp mới</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={msgTitle}
                onChange={(e) => setMsgTitle(e.target.value)}
                required
                placeholder="Tiêu đề lời ngỏ"
                className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
              <input
                type="text"
                value={msgAuthor}
                onChange={(e) => setMsgAuthor(e.target.value)}
                required
                placeholder="Họ tên người viết"
                className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
              <input
                type="text"
                value={msgRole}
                onChange={(e) => setMsgRole(e.target.value)}
                placeholder="Chức vụ / Vai trò"
                className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
              <input
                type="text"
                value={msgPeriod}
                onChange={(e) => setMsgPeriod(e.target.value)}
                placeholder="Nhiệm kỳ / Dịp kỷ niệm"
                className="rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
              />
            </div>
            <textarea
              value={msgContent}
              onChange={(e) => setMsgContent(e.target.value)}
              rows={4}
              required
              placeholder="Nội dung lời ngỏ, lời chúc..."
              className="w-full rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-sm text-white focus:border-[#F02028] focus:outline-none"
            />
            {/* Optional Thumbnail Upload / Link for New Message */}
            <div className="rounded-xl border border-white/10 bg-[#171719] p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">Ảnh thumbnail lời ngỏ (tùy chọn)</span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingNewMsgThumb ? 'Đang tải...' : 'Tải ảnh lên'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingNewMsgThumb(true);
                        try {
                          const res = await uploadOrEncodeMedia(file, 'image');
                          setMsgThumbnail(res.url);
                          notify('Đã tải ảnh thumbnail tạm thời. Nhấn "Lưu lời ngỏ" để lưu.', 'success');
                        } catch (err) {
                          notify(err instanceof Error ? err.message : 'Không thể tải ảnh.', 'error');
                        } finally {
                          setUploadingNewMsgThumb(false);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {msgThumbnail && (
                    <button
                      type="button"
                      onClick={() => setMsgThumbnail('')}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-[#F02028] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ảnh</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {msgThumbnail && (
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-[#242428]">
                    <img src={msgThumbnail} alt="Xem trước thumbnail" className="h-full w-full object-cover" />
                  </div>
                )}
                <input
                  type="text"
                  value={msgThumbnail}
                  onChange={(e) => setMsgThumbnail(e.target.value)}
                  placeholder="Hoặc dán đường dẫn ảnh thumbnail..."
                  className="w-full flex-1 rounded-lg border border-white/10 bg-[#242428] px-3 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddingMessage(false);
                  setMsgThumbnail('');
                }}
                className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs text-zinc-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#F02028] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Lưu lời ngỏ
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-5">
          {data.leaderMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-8 text-center text-sm text-zinc-400">
              Chưa có lời ngỏ nào.
            </div>
          ) : (
            data.leaderMessages.map((msg, index) => (
              <article key={msg.id} className="rounded-2xl border border-white/10 bg-[#242428] p-6 sm:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Thumbnail hình ảnh bên cạnh tiêu đề, lời ngỏ & nội dung thông điệp */}
                  <div className="w-full sm:w-52 md:w-56 shrink-0 space-y-2.5">
                    <div
                      className={`overflow-hidden rounded-xl aspect-[4/3] ${
                        msg.thumbnailImage
                          ? 'editorial-photo-frame border border-white/10 bg-[#171719]'
                          : 'border border-dashed border-white/20 bg-[#171719]'
                      }`}
                    >
                      {msg.thumbnailImage ? (
                        <ResilientImage
                          src={msg.thumbnailImage}
                          alt={`Ảnh minh họa ${msg.title}`}
                          downloadFileName={`loi-ngo-${msg.authorName || msg.title}`}
                          viewerSubtitle={`${msg.authorName}${msg.authorRole ? ` · ${msg.authorRole}` : ''}`}
                          canEdit={isAdmin}
                          onChangeImage={(nextUrl) =>
                            updateLeaderMessageThumbnail(
                              msg.id,
                              nextUrl,
                              'Đã lưu và cập nhật ảnh thumbnail lời ngỏ.'
                            )
                          }
                          onDeleteImage={() =>
                            updateLeaderMessageThumbnail(msg.id, '', 'Đã xóa ảnh thumbnail lời ngỏ.')
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : isAdmin ? (
                        <label className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                          <ImagePlus className="w-7 h-7 text-[#F02028]" />
                          <span className="text-xs font-medium">
                            {uploadingMsgThumbId === msg.id ? 'Đang tải ảnh...' : 'Tải ảnh thumbnail'}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              await handleUploadLeaderMessageThumb(msg.id, file);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-zinc-400">
                          <ImagePlus className="w-6 h-6 opacity-50" />
                          <span className="text-[11px]">Chưa có ảnh minh họa</span>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="inline-flex items-center gap-1 rounded-lg bg-[#F02028] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#d91b23] transition-colors cursor-pointer">
                            <Upload className="w-3 h-3" />
                            <span>
                              {uploadingMsgThumbId === msg.id
                                ? 'Đang tải...'
                                : msg.thumbnailImage
                                  ? 'Đổi ảnh'
                                  : 'Tải lên'}
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await handleUploadLeaderMessageThumb(msg.id, file);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              if (editingMsgThumbUrlId === msg.id) {
                                setEditingMsgThumbUrlId(null);
                              } else {
                                setMsgThumbUrlDraft(msg.thumbnailImage || '');
                                setEditingMsgThumbUrlId(msg.id);
                              }
                            }}
                            title="Nhập hoặc thay đổi đường dẫn ảnh"
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#171719] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>Link ảnh</span>
                          </button>

                          {msg.thumbnailImage && (
                            <button
                              type="button"
                              onClick={() =>
                                updateLeaderMessageThumbnail(msg.id, '', 'Đã xóa ảnh thumbnail lời ngỏ.')
                              }
                              title="Xóa ảnh thumbnail"
                              aria-label="Xóa ảnh thumbnail"
                              className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#171719] px-2 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-[#F02028] hover:text-[#F02028] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa</span>
                            </button>
                          )}
                        </div>

                        {editingMsgThumbUrlId === msg.id && (
                          <div className="flex flex-col gap-1.5 rounded-lg border border-white/15 bg-[#171719] p-2">
                            <input
                              type="text"
                              value={msgThumbUrlDraft}
                              onChange={(e) => setMsgThumbUrlDraft(e.target.value)}
                              placeholder="Dán link ảnh (https://...)"
                              className="w-full rounded-md border border-white/15 bg-[#242428] px-2.5 py-1.5 text-xs text-white focus:border-[#F02028] focus:outline-none"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingMsgThumbUrlId(null)}
                                className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-300 cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  updateLeaderMessageThumbnail(
                                    msg.id,
                                    msgThumbUrlDraft,
                                    msgThumbUrlDraft.trim()
                                      ? 'Đã lưu và cập nhật ảnh thumbnail lời ngỏ.'
                                      : 'Đã xóa ảnh thumbnail lời ngỏ.'
                                  );
                                  setEditingMsgThumbUrlId(null);
                                }}
                                className="rounded-md bg-[#F02028] px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                              >
                                Lưu & Cập nhật
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tiêu đề, thông tin người viết & nội dung thông điệp */}
                  <div className="flex-1 min-w-0 w-full space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <InlineEditableText
                          as="h3"
                          label="Tiêu đề lời ngỏ"
                          value={msg.title}
                          onSave={(val) =>
                            updateData(
                              (prev) => ({
                                ...prev,
                                leaderMessages: prev.leaderMessages.map((l) =>
                                  l.id === msg.id ? { ...l, title: val, dataOrigin: 'real' } : l
                                ),
                              }),
                              'Đã cập nhật tiêu đề lời ngỏ.'
                            )
                          }
                          className="font-display text-xl sm:text-2xl font-semibold text-white"
                        />
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <InlineEditableText
                            as="span"
                            label="Họ tên người viết"
                            value={msg.authorName}
                            onSave={(val) =>
                              updateData(
                                (prev) => ({
                                  ...prev,
                                  leaderMessages: prev.leaderMessages.map((l) =>
                                    l.id === msg.id ? { ...l, authorName: val, dataOrigin: 'real' } : l
                                  ),
                                }),
                                'Đã cập nhật tên tác giả thông điệp.'
                              )
                            }
                            className="font-medium text-zinc-200"
                          />
                          <span aria-hidden="true">·</span>
                          <InlineEditableText
                            as="span"
                            label="Chức vụ / Vai trò"
                            value={msg.authorRole}
                            onSave={(val) =>
                              updateData(
                                (prev) => ({
                                  ...prev,
                                  leaderMessages: prev.leaderMessages.map((l) =>
                                    l.id === msg.id ? { ...l, authorRole: val, dataOrigin: 'real' } : l
                                  ),
                                }),
                                'Đã cập nhật chức vụ người viết.'
                              )
                            }
                            className="text-zinc-400"
                          />
                          <span aria-hidden="true">·</span>
                          <InlineEditableText
                            as="span"
                            label="Nhiệm kỳ / Dịp kỷ niệm"
                            value={msg.period}
                            onSave={(val) =>
                              updateData(
                                (prev) => ({
                                  ...prev,
                                  leaderMessages: prev.leaderMessages.map((l) =>
                                    l.id === msg.id ? { ...l, period: val, dataOrigin: 'real' } : l
                                  ),
                                }),
                                'Đã cập nhật nhiệm kỳ / dịp kỷ niệm.'
                              )
                            }
                            className="text-zinc-400"
                          />
                          {msg.dataOrigin === 'sample' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#F02028]">Mẫu minh họa</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 shrink-0 self-start">
                          <button
                            type="button"
                            onClick={() => moveLeaderMessage(index, -1)}
                            disabled={index === 0}
                            aria-label="Di chuyển lời ngỏ lên trên"
                            title="Di chuyển lên"
                            className="rounded-lg border border-white/15 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLeaderMessage(index, 1)}
                            disabled={index === data.leaderMessages.length - 1}
                            aria-label="Di chuyển lời ngỏ xuống dưới"
                            title="Di chuyển xuống"
                            className="rounded-lg border border-white/15 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateData(
                                (prev) => ({
                                  ...prev,
                                  leaderMessages: prev.leaderMessages
                                    .filter((l) => l.id !== msg.id)
                                    .map((l, idx) => ({ ...l, orderIndex: idx })),
                                }),
                                'Đã xóa lời ngỏ.'
                              )
                            }
                            aria-label="Xóa lời ngỏ"
                            title="Xóa lời ngỏ"
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:bg-white/10 hover:text-[#F02028] cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="max-w-3xl border-t border-white/10 pt-4">
                      <InlineEditableText
                        as="p"
                        multiline
                        collapsedLines={3}
                        label="Nội dung lời ngỏ"
                        value={msg.content}
                        onSave={(val) =>
                          updateData(
                            (prev) => ({
                              ...prev,
                              leaderMessages: prev.leaderMessages.map((l) =>
                                l.id === msg.id ? { ...l, content: val, dataOrigin: 'real' } : l
                              ),
                            }),
                            'Đã cập nhật nội dung lời ngỏ.'
                          )
                        }
                        className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
