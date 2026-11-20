import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Download,
  ImageOff,
  ImagePlus,
  Link2,
  Maximize2,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { uploadOrEncodeMedia } from '../../services/indexedDb';

export interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  downloadFileName?: string;
  viewerSubtitle?: string;
  canEdit?: boolean;
  onChangeImage?: (nextUrl: string) => void | Promise<void>;
  onDeleteImage?: () => void | Promise<void>;
  disableViewer?: boolean;
  hideCornerButton?: boolean;
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
  return normalized.slice(0, 64) || 'hinh-anh';
}

function inferImageExtension(url: string, mimeType?: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';

  const dataMatch = url.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
  if (dataMatch?.[1]) {
    const ext = dataMatch[1].toLowerCase();
    return ext === 'jpeg' ? 'jpg' : ext;
  }

  const cleanUrl = url.split('?')[0].split('#')[0];
  const extMatch = cleanUrl.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (extMatch?.[1]) {
    const ext = extMatch[1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  }
  return 'jpg';
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  downloadFileName,
  viewerSubtitle,
  canEdit = false,
  onChangeImage,
  onDeleteImage,
  disableViewer = false,
  hideCornerButton = false,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [draftUrl, setDraftUrl] = useState(src || '');
  const [hasPendingChange, setHasPendingChange] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!hasPendingChange) {
      setDraftUrl(src || '');
    }
  }, [src, hasPendingChange]);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setZoom(1);
    setConfirmDelete(false);
    setShowUrlInput(false);
    setHasPendingChange(false);
    setDraftUrl(src || '');
    setStatusMessage(null);
  }, [src]);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeViewer();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [viewerOpen, closeViewer]);

  const editable = Boolean(canEdit && (onChangeImage || onDeleteImage));
  const hasImage = Boolean(src && !hasError);
  const effectiveSrc = hasPendingChange ? draftUrl : src || '';
  const hasEffectiveImage = Boolean(effectiveSrc && (!hasError || hasPendingChange));

  const openViewer = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (disableViewer) return;
    if (!hasImage && !editable) return;
    setDraftUrl(src || '');
    setUrlInputValue(src || '');
    setHasPendingChange(false);
    setConfirmDelete(false);
    setShowUrlInput(false);
    setStatusMessage(null);
    setZoom(1);
    setViewerOpen(true);
  };

  const handleDownload = async () => {
    if (!effectiveSrc) return;
    setDownloading(true);
    setStatusMessage(null);
    const baseName = sanitizeFileName(downloadFileName || alt || 'hinh-anh');
    try {
      if (effectiveSrc.startsWith('data:')) {
        const ext = inferImageExtension(effectiveSrc);
        const a = document.createElement('a');
        a.href = effectiveSrc;
        a.download = `${baseName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setStatusMessage({ type: 'success', text: 'Đã bắt đầu tải hình ảnh xuống máy.' });
        return;
      }

      const response = await fetch(effectiveSrc);
      if (!response.ok) {
        throw new Error('Fetch failed');
      }
      const blob = await response.blob();
      const ext = inferImageExtension(effectiveSrc, blob.type);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      setStatusMessage({ type: 'success', text: 'Đã tải hình ảnh xuống máy.' });
    } catch {
      const ext = inferImageExtension(effectiveSrc);
      const a = document.createElement('a');
      a.href = effectiveSrc;
      a.download = `${baseName}.${ext}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatusMessage({ type: 'success', text: 'Đã mở liên kết tải hình ảnh.' });
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadReplacement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatusMessage(null);
    setConfirmDelete(false);
    try {
      const res = await uploadOrEncodeMedia(file, 'image');
      setDraftUrl(res.url);
      setUrlInputValue(res.url);
      setHasPendingChange(true);
      setZoom(1);
      setStatusMessage({
        type: 'success',
        text: 'Đã tải ảnh mới. Nhấn "Lưu thay đổi" để áp dụng.',
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể tải hình ảnh đã chọn.',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleApplyUrlDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = urlInputValue.trim();
    if (!cleaned) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập đường dẫn hình ảnh hợp lệ.' });
      return;
    }
    setDraftUrl(cleaned);
    setHasPendingChange(true);
    setShowUrlInput(false);
    setConfirmDelete(false);
    setZoom(1);
    setStatusMessage({
      type: 'success',
      text: 'Đã xem trước ảnh mới. Nhấn "Lưu thay đổi" để lưu.',
    });
  };

  const handleSaveChanges = async () => {
    if (!onChangeImage) return;
    const nextUrl = (hasPendingChange ? draftUrl : src || '').trim();
    if (!nextUrl) {
      setStatusMessage({ type: 'error', text: 'Chưa có hình ảnh để lưu.' });
      return;
    }
    setSaving(true);
    setStatusMessage(null);
    try {
      await onChangeImage(nextUrl);
      setHasPendingChange(false);
      setHasError(false);
      setStatusMessage({ type: 'success', text: 'Đã lưu hình ảnh thành công.' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể lưu hình ảnh.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!onDeleteImage) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      await onDeleteImage();
      setConfirmDelete(false);
      setHasPendingChange(false);
      setDraftUrl('');
      setUrlInputValue('');
      setViewerOpen(false);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể xóa hình ảnh.',
      });
    } finally {
      setSaving(false);
    }
  };

  const viewerModal =
    viewerOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            data-force-dark="true"
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 sm:p-6 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label={`Xem hình ảnh: ${alt || 'Hình ảnh'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) {
                closeViewer();
              }
            }}
          >
            <div
              className="flex w-full max-w-5xl max-h-[94vh] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#171719] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Viewer Header */}
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#171719] px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm sm:text-base font-semibold text-white">
                      {alt || 'Xem hình ảnh'}
                    </h3>
                    {hasPendingChange && (
                      <span className="shrink-0 rounded-md bg-[#F02028]/20 px-2 py-0.5 text-[11px] font-medium text-[#F02028]">
                        Chưa lưu
                      </span>
                    )}
                  </div>
                  {viewerSubtitle && (
                    <p className="truncate text-xs text-zinc-400 mt-0.5">{viewerSubtitle}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {hasEffectiveImage && (
                    <div className="hidden sm:flex items-center gap-1 rounded-xl border border-white/10 bg-[#242428] p-1">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                        disabled={zoom <= 0.5}
                        title="Thu nhỏ"
                        aria-label="Thu nhỏ ảnh"
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(1)}
                        title="Đặt lại tỷ lệ 100%"
                        className="min-w-[46px] rounded-lg px-2 py-1 text-center font-mono-num text-xs text-zinc-200 hover:bg-white/10 cursor-pointer"
                      >
                        {Math.round(zoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                        disabled={zoom >= 3}
                        title="Phóng to"
                        aria-label="Phóng to ảnh"
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-40 cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={closeViewer}
                    aria-label="Đóng cửa sổ xem ảnh"
                    className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Zoomable Image Viewport */}
              <div className="relative flex-1 min-h-[240px] max-h-[64vh] overflow-auto bg-[#0d0d0f] flex items-center justify-center p-4">
                {hasEffectiveImage ? (
                  <img
                    src={effectiveSrc}
                    alt={alt}
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center center',
                    }}
                    className="max-h-[58vh] max-w-full rounded-xl object-contain transition-transform duration-150 select-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-zinc-400">
                    <ImageOff className="w-10 h-10 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-300">Chưa có hình ảnh tại vị trí này</p>
                    {editable && onChangeImage && (
                      <p className="text-xs text-zinc-500">
                        Chọn tệp ảnh từ thiết bị hoặc dán đường dẫn ảnh bên dưới để thêm mới.
                      </p>
                    )}
                  </div>
                )}

                {/* Mobile Zoom Bar */}
                {hasEffectiveImage && (
                  <div className="sm:hidden fixed bottom-28 right-5 flex items-center gap-1 rounded-xl border border-white/15 bg-black/75 p-1 backdrop-blur-md">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                      disabled={zoom <= 0.5}
                      aria-label="Thu nhỏ"
                      className="rounded-lg p-1.5 text-zinc-200 disabled:opacity-40"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      className="px-1.5 font-mono-num text-[11px] text-white"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                      disabled={zoom >= 3}
                      aria-label="Phóng to"
                      className="rounded-lg p-1.5 text-zinc-200 disabled:opacity-40"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Optional URL Input Row */}
              {showUrlInput && editable && onChangeImage && (
                <form
                  onSubmit={handleApplyUrlDraft}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 border-t border-white/10 bg-[#202024] px-4 py-3 sm:px-6"
                >
                  <input
                    type="text"
                    value={urlInputValue}
                    onChange={(e) => setUrlInputValue(e.target.value)}
                    placeholder="Dán đường dẫn ảnh (https://... hoặc /uploads/...)"
                    className="flex-1 rounded-xl border border-white/15 bg-[#171719] px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/25 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Xem trước</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}

              {/* Status Feedback */}
              {statusMessage && (
                <div
                  className={`border-t px-4 py-2 text-xs sm:px-6 ${
                    statusMessage.type === 'error'
                      ? 'border-[#F02028]/30 bg-[#F02028]/10 text-[#ff8a8f]'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  {statusMessage.text}
                </div>
              )}

              {/* Footer Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/10 bg-[#171719] px-4 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  {hasEffectiveImage && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#F02028]" />
                      <span>{downloading ? 'Đang tải...' : 'Tải xuống'}</span>
                    </button>
                  )}

                  {editable && onChangeImage && (
                    <>
                      <label className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-white hover:border-[#F02028] hover:bg-white/10 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-[#F02028]" />
                        <span>{uploading ? 'Đang tải ảnh...' : hasEffectiveImage ? 'Thay đổi ảnh' : 'Chọn ảnh'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleUploadReplacement}
                          disabled={uploading || saving}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setUrlInputValue(effectiveSrc);
                          setShowUrlInput((v) => !v);
                          setConfirmDelete(false);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 hover:text-white cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Đổi bằng link</span>
                      </button>

                      {hasPendingChange && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftUrl(src || '');
                            setUrlInputValue(src || '');
                            setHasPendingChange(false);
                            setStatusMessage(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Hoàn tác</span>
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {editable && onChangeImage && (
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={saving || uploading || !effectiveSrc.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-45 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Đang lưu...' : hasPendingChange ? 'Lưu thay đổi' : 'Lưu ảnh'}</span>
                    </button>
                  )}

                  {editable && onDeleteImage && hasImage && (
                    confirmDelete ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-[#F02028]/50 bg-[#F02028]/10 px-2.5 py-1">
                        <span className="text-xs text-[#ff9ea2]">Xóa ảnh này?</span>
                        <button
                          type="button"
                          onClick={handleDeleteConfirmed}
                          disabled={saving}
                          className="rounded-lg bg-[#F02028] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-50 cursor-pointer"
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="rounded-lg px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete(true);
                          setShowUrlInput(false);
                        }}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-[#F02028] disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (!hasImage) {
    return (
      <>
        <div
          onClick={!disableViewer && editable ? openViewer : undefined}
          role={!disableViewer && editable ? 'button' : 'img'}
          tabIndex={!disableViewer && editable ? 0 : undefined}
          onKeyDown={
            !disableViewer && editable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openViewer();
                  }
                }
              : undefined
          }
          aria-label={alt}
          title={!disableViewer && editable ? 'Nhấn để thêm hình ảnh' : undefined}
          className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#242428] to-[#171719] text-zinc-400 p-4 text-center ${
            !disableViewer && editable ? 'cursor-pointer hover:bg-[#2a2a30] transition-colors' : ''
          } ${className}`}
        >
          {!disableViewer && editable ? (
            <ImagePlus className="w-6 h-6 mb-1.5 text-zinc-400" />
          ) : (
            <ImageOff className="w-6 h-6 mb-1.5 text-zinc-500" />
          )}
          <span className="text-xs text-zinc-400 line-clamp-2">
            {fallbackLabel || alt || 'Chưa có hình ảnh'}
          </span>
        </div>
        {viewerModal}
      </>
    );
  }

  return (
    <>
      <div className="relative group/resilient h-full w-full overflow-hidden">
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          onClick={disableViewer ? undefined : openViewer}
          className={`${className} ${disableViewer ? '' : 'cursor-zoom-in'}`}
        />
        {!disableViewer && !hideCornerButton && (
          <button
            type="button"
            onClick={openViewer}
            aria-label={`Xem mở rộng và tùy chọn ảnh: ${alt}`}
            title="Xem mở rộng, tải xuống, thay đổi hoặc xóa ảnh"
            className="absolute bottom-2 right-2 z-20 inline-flex items-center justify-center rounded-lg border border-white/15 bg-black/70 p-1.5 text-white opacity-80 sm:opacity-0 sm:group-hover/resilient:opacity-100 focus:opacity-100 hover:bg-[#F02028] hover:border-[#F02028] transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {viewerModal}
    </>
  );
}
