import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Maximize2, Pencil, RefreshCw, Save, X } from 'lucide-react';

export interface TextExpandEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  label?: string;
  multiline?: boolean;
  placeholder?: string;
  emptyDisplay?: string;
  canEdit?: boolean;
  allowEmpty?: boolean;
  initialMode?: 'view' | 'edit';
  onSave?: (nextValue: string) => void | Promise<unknown>;
}

export function TextExpandEditorModal({
  isOpen,
  onClose,
  value,
  label,
  multiline = false,
  placeholder = 'Nhập nội dung...',
  emptyDisplay = 'Chưa có nội dung.',
  canEdit = false,
  allowEmpty = false,
  initialMode = 'view',
  onSave,
}: TextExpandEditorModalProps) {
  const editable = Boolean(canEdit && onSave);
  const [mode, setMode] = useState<'view' | 'edit'>(editable && initialMode === 'edit' ? 'edit' : 'view');
  const [draft, setDraft] = useState(value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(value);
    setMode(editable && initialMode === 'edit' ? 'edit' : 'view');
    setSavedNotice(false);
    setCopied(false);
  }, [isOpen, value, editable, initialMode]);

  useEffect(() => {
    if (!isOpen || mode !== 'edit') return;
    const timer = window.setTimeout(() => {
      if (multiline) {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      } else {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [isOpen, mode, multiline]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (mode === 'edit' && initialMode === 'view') {
          setDraft(value);
          setMode('view');
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, mode, initialMode, value, onClose]);

  const activeText = mode === 'edit' ? draft : value;
  const stats = useMemo(() => {
    const trimmed = activeText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { chars: activeText.length, words };
  }, [activeText]);

  const hasChanges = draft.trim() !== value.trim();

  const resolveNextValue = () => {
    const trimmed = draft.trim();
    if (allowEmpty) return trimmed;
    return trimmed || value;
  };

  const handleSave = async (closeAfterSave: boolean) => {
    if (!onSave || isSubmitting) return;
    const nextValue = resolveNextValue();
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSave(nextValue));
      setDraft(nextValue);
      if (closeAfterSave) {
        onClose();
      } else {
        setSavedNotice(true);
        setMode('view');
        window.setTimeout(() => setSavedNotice(false), 2500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    const textToCopy = mode === 'edit' ? draft : value;
    if (!textToCopy) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures on restricted environments
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={label || 'Xem và chỉnh sửa nội dung'}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-3xl max-h-[88vh] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#171719] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#171719] px-5 py-4 sm:px-6">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#F02028]/40 bg-[#F02028]/10 text-[#F02028]">
              {mode === 'edit' ? <Pencil className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base sm:text-lg font-semibold text-white">
                {label || 'Nội dung chi tiết'}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                <span>{mode === 'edit' ? 'Chế độ chỉnh sửa' : 'Xem mở rộng đầy đủ'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num">
                  {stats.words} từ · {stats.chars} ký tự
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeText && (
              <button
                type="button"
                onClick={handleCopy}
                title="Sao chép toàn bộ nội dung"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#242428] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-[#F02028]/60 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sao chép</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
              className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {savedNotice && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>Đã lưu và cập nhật nội dung thành công.</span>
            </div>
          )}

          {mode === 'edit' ? (
            <div className="space-y-2.5">
              {multiline ? (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={11}
                  placeholder={placeholder}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      void handleSave(true);
                    }
                  }}
                  className="w-full min-h-[240px] max-h-[54vh] resize-y rounded-2xl border border-white/15 bg-[#242428] px-4 py-3.5 text-sm sm:text-base leading-relaxed text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
                />
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSave(true);
                    }
                  }}
                  className="w-full rounded-2xl border border-white/15 bg-[#242428] px-4 py-3.5 text-sm sm:text-base text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none"
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                <span>
                  {multiline
                    ? 'Mẹo: Nhấn Ctrl + Enter (hoặc ⌘ + Enter) để lưu & cập nhật nhanh.'
                    : 'Mẹo: Nhấn Enter để lưu & cập nhật nhanh, Esc để hủy.'}
                </span>
                {hasChanges && <span className="text-amber-400">Có thay đổi chưa lưu</span>}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#242428]/70 p-5 sm:p-6">
              {value ? (
                <div className="whitespace-pre-line break-words text-sm sm:text-base leading-relaxed text-zinc-100 select-text">
                  {value}
                </div>
              ) : (
                <div className="text-sm italic text-zinc-500">{emptyDisplay}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#171719] px-5 py-3.5 sm:px-6">
          <div className="text-xs text-zinc-400">
            {mode === 'edit'
              ? 'Thay đổi sẽ được lưu và đồng bộ cập nhật ngay lập tức.'
              : editable
                ? 'Nhấn Chỉnh sửa để sửa chữa, lưu lại và cập nhật nội dung.'
                : 'Đang xem mở rộng toàn bộ nội dung.'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === 'edit' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(value);
                    if (initialMode === 'view') {
                      setMode('view');
                    } else {
                      onClose();
                    }
                  }}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Hủy</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave(false)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#F02028]/50 bg-[#242428] px-3.5 py-2 text-xs font-semibold text-white hover:border-[#F02028] hover:bg-[#F02028]/15 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-[#F02028]" />
                  <span>Lưu lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? 'Đang cập nhật...' : 'Lưu & Cập nhật'}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#242428] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>Đóng</span>
                </button>
                {editable && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(value);
                      setSavedNotice(false);
                      setMode('edit');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
