import React, { useEffect, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import { CollapsibleText } from './CollapsibleText';

interface InlineEditableTextProps {
  value: string;
  onSave: (nextValue: string) => void;
  multiline?: boolean;
  collapsible?: boolean;
  collapsedLines?: 2 | 3 | 4 | 6 | 8;
  textareaRows?: number;
  inline?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  label?: string;
}

export function InlineEditableText({
  value,
  onSave,
  multiline = false,
  collapsible,
  collapsedLines = 2,
  textareaRows = 4,
  inline,
  as: Tag = 'p',
  className = '',
  inputClassName = '',
  placeholder = 'Nhập nội dung...',
  label,
}: InlineEditableTextProps) {
  const { isAdmin } = useMemoir();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const isCollapsible = collapsible ?? multiline;
  const isInline = inline ?? (Tag === 'span' && !multiline && !isCollapsible);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!isAdmin) {
    if (isCollapsible) {
      return <CollapsibleText as={Tag} text={value} collapsedLines={collapsedLines} className={className} />;
    }
    return <Tag className={className}>{value}</Tag>;
  }

  if (isEditing) {
    return (
      <div className={`relative rounded-xl border border-[#F02028] bg-[#171719] p-3 shadow-lg ${isInline ? 'inline-block min-w-[220px] align-middle' : 'w-full'}`}>
        {label && (
          <div className="mb-1.5 text-[11px] font-medium text-[#F02028]">
            Đang chỉnh sửa trực tiếp: {label}
          </div>
        )}
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={textareaRows}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(value);
                setIsEditing(false);
              }
            }}
            className={`w-full rounded-lg border border-white/15 bg-[#242428] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none ${inputClassName}`}
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSave(draft.trim() || value);
                setIsEditing(false);
              } else if (e.key === 'Escape') {
                setDraft(value);
                setIsEditing(false);
              }
            }}
            className={`w-full rounded-lg border border-white/15 bg-[#242428] px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#F02028] focus:outline-none ${inputClassName}`}
          />
        )}
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setIsEditing(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft.trim() || value);
              setIsEditing(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F02028] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative inline-block ${isInline ? '' : 'w-full'}`}>
      <div
        onClick={() => setIsEditing(true)}
        title="Nhấn để chỉnh sửa trực tiếp"
        className="cursor-pointer rounded-lg transition-colors duration-150 group-hover:outline group-hover:outline-1 group-hover:outline-dashed group-hover:outline-[#F02028]/70 group-hover:bg-white/[0.03]"
      >
        {isCollapsible ? (
          <CollapsibleText
            as={Tag}
            text={value}
            collapsedLines={collapsedLines}
            className={className}
            stopPropagationOnToggle
          />
        ) : (
          <Tag className={className}>{value}</Tag>
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={`Sửa ${label || 'nội dung'}`}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute -top-2.5 -right-2 z-10 inline-flex items-center gap-1 rounded-md border border-[#F02028]/60 bg-[#171719] px-2 py-0.5 text-[11px] font-medium text-white shadow transition-opacity cursor-pointer"
      >
        <Pencil className="w-3 h-3 text-[#F02028]" />
        Sửa
      </button>
    </div>
  );
}
