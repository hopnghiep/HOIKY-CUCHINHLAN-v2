import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ImageOff,
  ImagePlus,
  Images,
  Maximize2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { HeroGalleryPhoto } from '../../types/memoir';
import { uploadCompressedImage } from '../../services/indexedDb';
import { ResilientImage } from '../common/ResilientMedia';

interface HeroCoverSlideshowProps {
  heroImage: string;
  galleryPhotos?: HeroGalleryPhoto[];
  isAdmin: boolean;
  onUpdateSlides: (nextSlides: HeroGalleryPhoto[], toastMessage: string) => void;
  onNotify: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const SLIDE_INTERVAL_MS = 4500;

function formatKb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function sanitizeFileName(raw: string): string {
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized.slice(0, 64) || 'anh-bia-trang-chu';
}

function inferExt(url: string, mimeType?: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  const match = url.split('?')[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match?.[1] && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(match[1].toLowerCase())) {
    return match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  }
  return 'jpg';
}

export function HeroCoverSlideshow({
  heroImage,
  galleryPhotos,
  isAdmin,
  onUpdateSlides,
  onNotify,
}: HeroCoverSlideshowProps) {
  const slides = useMemo<HeroGalleryPhoto[]>(() => {
    const validGallery = Array.isArray(galleryPhotos)
      ? galleryPhotos.filter((p) => p && typeof p.url === 'string' && p.url.trim().length > 0)
      : [];
    if (validGallery.length > 0) {
      return validGallery;
    }
    if (heroImage && heroImage.trim()) {
      return [
        {
          id: 'hero_primary',
          url: heroImage,
          caption: 'Không gian trường THPT Hoàng Hoa Thám – Chi đoàn Cù Chính Lan',
          addedAt: '',
        },
      ];
    }
    return [];
  }, [galleryPhotos, heroImage]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const [expandedPaused, setExpandedPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  const [managerOpen, setManagerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({});

  // Keep activeIndex in bounds whenever slides change
  useEffect(() => {
    if (slides.length === 0) {
      setActiveIndex(0);
      setExpandedOpen(false);
    } else if (activeIndex >= slides.length) {
      setActiveIndex(slides.length - 1);
    }
  }, [slides.length, activeIndex]);

  // Smooth auto-advance on the inline Hero cover
  useEffect(() => {
    if (slides.length <= 1 || isPaused || isHovered || managerOpen || expandedOpen) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [slides.length, isPaused, isHovered, managerOpen, expandedOpen]);

  // Smooth auto-advance inside the Expanded Full-Screen Slideshow Viewer (when zoom === 1 and not paused)
  useEffect(() => {
    if (!expandedOpen || slides.length <= 1 || expandedPaused || zoom > 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [expandedOpen, slides.length, expandedPaused, zoom]);

  // Preload next slide in background for zero-flicker transitions
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextSlide = slides[(activeIndex + 1) % slides.length];
    if (!nextSlide?.url) return;
    const preload = new Image();
    preload.decoding = 'async';
    preload.src = nextSlide.url;
  }, [activeIndex, slides]);

  const goPrev = useCallback(() => {
    if (slides.length <= 1) return;
    setZoom(1);
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    if (slides.length <= 1) return;
    setZoom(1);
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const closeExpanded = useCallback(() => {
    setExpandedOpen(false);
    setZoom(1);
  }, []);

  // Keyboard navigation for Expanded Slideshow Viewer
  useEffect(() => {
    if (!expandedOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeExpanded();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setExpandedPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedOpen, closeExpanded, goPrev, goNext]);

  // Close manager modal on Escape
  useEffect(() => {
    if (!managerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setManagerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [managerOpen]);

  const openExpandedViewer = () => {
    if (slides.length === 0) return;
    setZoom(1);
    setExpandedPaused(isPaused);
    setExpandedOpen(true);
  };

  const handleDownloadCurrent = async () => {
    const slide = slides[activeIndex] || slides[0];
    if (!slide?.url) return;
    setDownloading(true);
    const baseName = sanitizeFileName(slide.caption || `anh-bia-trang-chu-${activeIndex + 1}`);
    try {
      if (slide.url.startsWith('data:')) {
        const ext = inferExt(slide.url);
        const a = document.createElement('a');
        a.href = slide.url;
        a.download = `${baseName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        onNotify('Đã bắt đầu tải hình ảnh xuống máy.', 'success');
        return;
      }
      const res = await fetch(slide.url);
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const ext = inferExt(slide.url, blob.type);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      onNotify('Đã tải hình ảnh xuống máy.', 'success');
    } catch {
      const a = document.createElement('a');
      a.href = slide.url;
      a.download = `${baseName}.${inferExt(slide.url)}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadSlides = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 60 - slides.length);
    if (remainingSlots === 0) {
      onNotify('Slideshow đã đạt tối đa 60 ảnh.', 'error');
      e.target.value = '';
      return;
    }

    const batch = files.slice(0, remainingSlots);
    setUploading(true);
    try {
      const added: HeroGalleryPhoto[] = [];
      let totalOriginal = 0;
      let totalCompressed = 0;

      for (const file of batch) {
        const res = await uploadCompressedImage(file, { maxDimension: 1600, quality: 0.82 });
        totalOriginal += res.originalBytes;
        totalCompressed += res.compressedBytes;
        added.push({
          id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          caption: file.name.replace(/\.[^.]+$/, ''),
          addedAt: new Date().toISOString().slice(0, 10),
        });
      }

      const nextSlides = [...slides, ...added];
      const savedNote =
        totalOriginal > totalCompressed && totalOriginal > 0
          ? ` (tự động nén ${formatKb(totalOriginal)} → ${formatKb(totalCompressed)})`
          : '';
      onUpdateSlides(nextSlides, `Đã thêm ${added.length} ảnh vào slideshow ảnh bìa${savedNote}.`);
      setActiveIndex(nextSlides.length - added.length);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Không thể tải và nén hình ảnh.', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddSlideByUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = urlDraft.trim();
    if (!cleaned) return;
    if (slides.length >= 60) {
      onNotify('Slideshow đã đạt tối đa 60 ảnh.', 'error');
      return;
    }
    const newSlide: HeroGalleryPhoto = {
      id: `slide_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url: cleaned,
      caption: `Ảnh bìa #${slides.length + 1}`,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    const nextSlides = [...slides, newSlide];
    onUpdateSlides(nextSlides, 'Đã thêm ảnh từ đường dẫn vào slideshow ảnh bìa.');
    setActiveIndex(nextSlides.length - 1);
    setUrlDraft('');
  };

  const handleMoveSlide = (index: number, dir: -1 | 1) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const nextSlides = [...slides];
    const [moved] = nextSlides.splice(index, 1);
    nextSlides.splice(targetIdx, 0, moved);
    onUpdateSlides(nextSlides, 'Đã thay đổi vị trí ảnh trong slideshow.');
    setActiveIndex(targetIdx);
  };

  const handleDeleteSlide = (slideId: string) => {
    const idx = slides.findIndex((s) => s.id === slideId);
    const nextSlides = slides.filter((s) => s.id !== slideId);
    onUpdateSlides(nextSlides, 'Đã xóa ảnh khỏi slideshow bìa Trang chủ.');
    if (idx !== -1 && activeIndex >= nextSlides.length) {
      setActiveIndex(Math.max(0, nextSlides.length - 1));
    }
    setCaptionDrafts((prev) => {
      const copy = { ...prev };
      delete copy[slideId];
      return copy;
    });
  };

  const handleSaveCaption = (slideId: string) => {
    const nextCaption = (captionDrafts[slideId] ?? '').trim();
    const nextSlides = slides.map((s) => (s.id === slideId ? { ...s, caption: nextCaption } : s));
    onUpdateSlides(nextSlides, 'Đã lưu chú thích ảnh bìa.');
    setCaptionDrafts((prev) => {
      const copy = { ...prev };
      delete copy[slideId];
      return copy;
    });
  };

  const currentSlide = slides[activeIndex] || slides[0] || null;

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={slides.length > 0 ? openExpandedViewer : undefined}
        role={slides.length > 0 ? 'button' : undefined}
        tabIndex={slides.length > 0 ? 0 : undefined}
        onKeyDown={(e) => {
          if (slides.length > 0 && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openExpandedViewer();
          }
        }}
        aria-label={slides.length > 0 ? 'Nhấn để xem mở rộng trọn vẹn slideshow ảnh bìa' : undefined}
        className={`group relative h-64 sm:h-80 lg:h-full min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-[#242428] ${
          slides.length > 0 ? 'cursor-zoom-in' : ''
        }`}
      >
        {slides.length === 0 ? (
          <ResilientImage
            src=""
            alt="Không gian trường THPT Hoàng Hoa Thám – Chi đoàn Cù Chính Lan"
            downloadFileName="anh-bia-trang-chu-chi-doan-cu-chinh-lan"
            viewerSubtitle="Ảnh bìa Trang chủ · Hồi ký Chi đoàn Cù Chính Lan"
            canEdit={isAdmin}
            onChangeImage={(nextUrl) =>
              onUpdateSlides(
                [
                  {
                    id: `slide_${Date.now()}`,
                    url: nextUrl,
                    caption: 'Ảnh bìa Trang chủ',
                    addedAt: new Date().toISOString().slice(0, 10),
                  },
                ],
                'Đã thêm ảnh bìa Trang chủ.'
              )
            }
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            {/* Crossfading animated slide layers */}
            {slides.map((slide, idx) => {
              const isActive = idx === activeIndex;
              const hasFailed = failedIds[slide.id];
              return (
                <div
                  key={slide.id}
                  aria-hidden={!isActive}
                  className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                    isActive
                      ? 'z-10 opacity-100 scale-100'
                      : 'z-0 opacity-0 scale-105 pointer-events-none'
                  }`}
                >
                  {hasFailed ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1c1c20] text-zinc-500">
                      <ImageOff className="w-7 h-7" />
                      <span className="text-xs">Không tải được hình ảnh</span>
                    </div>
                  ) : (
                    <img
                      src={slide.url}
                      alt={slide.caption || `Ảnh bìa Trang chủ #${idx + 1}`}
                      decoding="async"
                      onError={() => setFailedIds((prev) => ({ ...prev, [slide.id]: true }))}
                      className={`h-full w-full object-cover transition-transform duration-[5000ms] ease-out ${
                        isActive && !isPaused ? 'scale-[1.04]' : 'scale-100'
                      }`}
                    />
                  )}
                </div>
              );
            })}

            {/* Subtle bottom gradient for crisp controls readability */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

            {/* Top-right Expand Fullscreen button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openExpandedViewer();
              }}
              aria-label="Xem mở rộng trọn vẹn slideshow"
              title="Xem mở rộng trọn vẹn"
              className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/65 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md hover:border-white/40 hover:bg-black/85 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xem trọn vẹn</span>
            </button>

            {/* Previous / Next controls when > 1 slide */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  aria-label="Ảnh bìa trước"
                  title="Ảnh trước"
                  className="absolute left-3 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 p-2 text-white backdrop-blur-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/80 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  aria-label="Ảnh bìa tiếp theo"
                  title="Ảnh tiếp theo"
                  className="absolute right-3 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/55 p-2 text-white backdrop-blur-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/80 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Bottom bar: caption + dot indicators + play/pause */}
            <div className="absolute inset-x-3 bottom-3 z-30 flex items-end justify-between gap-3 pointer-events-none">
              <div className="min-w-0 flex-1 space-y-1.5">
                {currentSlide?.caption && (
                  <div className="truncate text-xs font-medium text-white/95 drop-shadow">
                    {currentSlide.caption}
                  </div>
                )}
                {slides.length > 1 && (
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveIndex(idx);
                        }}
                        aria-label={`Chuyển đến ảnh ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === activeIndex ? 'w-6 bg-[#F02028]' : 'w-2 bg-white/45 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {slides.length > 1 && (
                <div className="flex items-center gap-1.5 shrink-0 pointer-events-auto">
                  <span className="rounded-lg bg-black/60 px-2 py-1 font-mono-num text-[11px] text-zinc-200 backdrop-blur-sm">
                    {activeIndex + 1}/{slides.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPaused((prev) => !prev);
                    }}
                    aria-label={isPaused ? 'Tiếp tục trình chiếu' : 'Tạm dừng trình chiếu'}
                    title={isPaused ? 'Tiếp tục trình chiếu' : 'Tạm dừng trình chiếu'}
                    className="rounded-lg border border-white/20 bg-black/60 p-1.5 text-white hover:bg-black/80 backdrop-blur-sm cursor-pointer transition-colors"
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Admin-only Slideshow Manager Trigger */}
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setManagerOpen(true);
            }}
            title="Quản lý ảnh bìa động (Slideshow)"
            className="absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/70 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md hover:border-[#F02028] hover:bg-black/85 transition-colors cursor-pointer"
          >
            <Images className="w-3.5 h-3.5 text-[#F02028]" />
            <span>Quản lý ảnh bìa ({slides.length})</span>
          </button>
        )}
      </div>

      {/* Full-Screen Expanded Slideshow Viewer (Uncropped Full Frame + Live Slideshow) */}
      {expandedOpen &&
        slides.length > 0 &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-force-dark="true"
            role="dialog"
            aria-modal="true"
            aria-label="Xem mở rộng trọn vẹn slideshow ảnh bìa Trang chủ"
            onClick={closeExpanded}
            className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md"
          >
            {/* Top Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#141416]/90 px-4 sm:px-6 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-mono-num font-semibold text-[#F02028]">
                    {activeIndex + 1} / {slides.length}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {slides.length > 1
                      ? expandedPaused || zoom > 1
                        ? 'Đã tạm dừng trình chiếu'
                        : 'Đang trình chiếu tự động'
                      : 'Ảnh bìa Trang chủ'}
                  </span>
                </div>
                {currentSlide?.caption && (
                  <div className="mt-0.5 truncate text-sm font-medium text-white">
                    {currentSlide.caption}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExpandedPaused((p) => !p)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/10 cursor-pointer"
                  >
                    {expandedPaused ? <Play className="w-3.5 h-3.5 text-[#F02028]" /> : <Pause className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{expandedPaused ? 'Trình chiếu' : 'Tạm dừng'}</span>
                  </button>
                )}

                <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    aria-label="Thu nhỏ"
                    title="Thu nhỏ"
                    className="rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="min-w-[42px] text-center font-mono-num text-xs text-zinc-200">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    aria-label="Phóng to"
                    title="Phóng to"
                    className="rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoom !== 1 && (
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      aria-label="Khôi phục kích thước gốc"
                      title="Kích thước vừa khung"
                      className="rounded-lg p-1 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCurrent}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{downloading ? 'Đang tải...' : 'Tải xuống'}</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      closeExpanded();
                      setManagerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:border-[#F02028] hover:bg-white/10 cursor-pointer"
                  >
                    <Images className="w-3.5 h-3.5 text-[#F02028]" />
                    <span className="hidden md:inline">Quản lý ảnh bìa</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={closeExpanded}
                  aria-label="Đóng xem mở rộng"
                  title="Đóng (Esc)"
                  className="rounded-xl border border-white/15 bg-white/5 p-1.5 text-zinc-200 hover:bg-[#F02028] hover:border-[#F02028] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Center Full Uncropped Slideshow Stage */}
            <div className="relative flex flex-1 items-center justify-center overflow-auto p-3 sm:p-6">
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPrev();
                    }}
                    aria-label="Ảnh trước"
                    title="Ảnh trước (←)"
                    className="fixed left-3 sm:left-6 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 p-2.5 sm:p-3 text-white shadow-xl backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext();
                    }}
                    aria-label="Ảnh tiếp theo"
                    title="Ảnh tiếp theo (→)"
                    className="fixed right-3 sm:right-6 top-1/2 z-30 -translate-y-1/2 rounded-full border border-white/20 bg-black/70 p-2.5 sm:p-3 text-white shadow-xl backdrop-blur-md hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </>
              )}

              <div
                onClick={(e) => e.stopPropagation()}
                className="relative flex h-full w-full items-center justify-center"
              >
                {slides.map((slide, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={slide.id}
                      aria-hidden={!isActive}
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
                        isActive ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'
                      }`}
                    >
                      <img
                        src={slide.url}
                        alt={slide.caption || `Ảnh bìa Trang chủ #${idx + 1}`}
                        decoding="async"
                        style={{ transform: `scale(${isActive ? zoom : 1})` }}
                        className="max-h-full max-w-full rounded-xl object-contain shadow-2xl transition-transform duration-300 ease-out select-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Thumbnail Filmstrip for Quick Jump */}
            {slides.length > 1 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="border-t border-white/10 bg-[#141416]/90 px-4 py-3"
              >
                <div className="mx-auto flex max-w-4xl items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-0.5">
                  {slides.map((slide, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          setActiveIndex(idx);
                        }}
                        aria-label={`Xem ảnh ${idx + 1}`}
                        className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                          isActive
                            ? 'border-[#F02028] opacity-100 scale-105'
                            : 'border-white/15 opacity-55 hover:opacity-90'
                        }`}
                      >
                        <img
                          src={slide.url}
                          alt={slide.caption || `Ảnh ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* Admin Slideshow Manager Modal */}
      {isAdmin &&
        managerOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
            onClick={() => setManagerOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Quản lý ảnh bìa động Trang chủ"
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#171719] shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 sm:px-6 py-4">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-semibold text-white">
                    Quản lý ảnh bìa động (Slideshow)
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Thêm nhiều ảnh (tự động nén tối ưu để chuyển cảnh mượt mà), sắp xếp thứ tự hoặc xóa ảnh hiển thị.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManagerOpen(false)}
                  aria-label="Đóng cửa sổ quản lý ảnh bìa"
                  className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload & URL Add Toolbar */}
              <div className="border-b border-white/10 bg-[#1e1e22] px-5 sm:px-6 py-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors cursor-pointer">
                    <ImagePlus className="w-4 h-4" />
                    <span>{uploading ? 'Đang nén và tải ảnh...' : 'Tải ảnh lên (tự động nén)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading}
                      onChange={handleUploadSlides}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-zinc-400">
                    Đang có <strong className="text-white">{slides.length}</strong> / 60 ảnh · Tự động chuyển sau 4,5 giây
                  </span>
                </div>

                <form onSubmit={handleAddSlideByUrl} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder="Hoặc dán đường dẫn ảnh (https://...) để thêm nhanh"
                    className="flex-1 rounded-xl border border-white/10 bg-[#171719] px-3.5 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!urlDraft.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F02028]" />
                    <span>Thêm từ link</span>
                  </button>
                </form>
              </div>

              {/* Slide List */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3">
                {slides.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#242428]/50 p-10 text-center text-sm text-zinc-400">
                    Chưa có ảnh bìa nào. Nhấn <strong>Tải ảnh lên</strong> để tạo slideshow cho Trang chủ.
                  </div>
                ) : (
                  slides.map((slide, idx) => {
                    const captionVal =
                      captionDrafts[slide.id] !== undefined ? captionDrafts[slide.id] : slide.caption || '';
                    const isDirty = captionDrafts[slide.id] !== undefined && captionDrafts[slide.id] !== slide.caption;
                    return (
                      <div
                        key={slide.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-2xl border border-white/10 bg-[#242428] p-3"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveIndex(idx)}
                          title="Xem trước ảnh này trên slideshow"
                          className={`relative h-20 w-full sm:w-32 shrink-0 overflow-hidden rounded-xl border cursor-pointer ${
                            idx === activeIndex ? 'border-[#F02028]' : 'border-white/10'
                          }`}
                        >
                          <img
                            src={slide.url}
                            alt={slide.caption || `Ảnh ${idx + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute left-1.5 top-1.5 rounded-md bg-black/75 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-white">
                            #{idx + 1}
                          </span>
                        </button>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="font-medium text-zinc-200">
                              {idx === 0 ? 'Ảnh bìa chính (vị trí đầu tiên)' : `Ảnh vị trí #${idx + 1}`}
                            </span>
                            {slide.addedAt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono-num">{slide.addedAt}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={captionVal}
                              onChange={(e) =>
                                setCaptionDrafts((prev) => ({ ...prev, [slide.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveCaption(slide.id);
                                }
                              }}
                              placeholder="Chú thích hiển thị trên ảnh bìa (tùy chọn)..."
                              className="flex-1 min-w-0 rounded-lg border border-white/10 bg-[#171719] px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
                            />
                            {isDirty && (
                              <button
                                type="button"
                                onClick={() => handleSaveCaption(slide.id)}
                                title="Lưu chú thích"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 cursor-pointer shrink-0"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Lưu</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Di chuyển ảnh lên trên"
                            title="Di chuyển lên"
                            className="rounded-lg border border-white/15 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSlide(idx, 1)}
                            disabled={idx === slides.length - 1}
                            aria-label="Di chuyển ảnh xuống dưới"
                            title="Di chuyển xuống"
                            className="rounded-lg border border-white/15 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlide(slide.id)}
                            aria-label="Xóa ảnh khỏi slideshow"
                            title="Xóa ảnh"
                            className="rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 hover:border-[#F02028]/50 hover:bg-[#F02028]/15 hover:text-[#F02028] cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end border-t border-white/10 px-5 sm:px-6 py-3.5">
                <button
                  type="button"
                  onClick={() => setManagerOpen(false)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
