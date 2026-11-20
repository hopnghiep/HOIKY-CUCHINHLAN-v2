import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { TextExpandEditorModal } from './TextExpandEditorModal';

interface CollapsibleTextProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  collapsedLines?: 2 | 3 | 4 | 6 | 8;
  defaultExpanded?: boolean;
  stopPropagationOnToggle?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  label?: string;
  canEdit?: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
  onSave?: (nextValue: string) => void | Promise<unknown>;
  disableModal?: boolean;
  stopPropagationOnClick?: boolean;
}

const CLAMP_CLASSES: Record<2 | 3 | 4 | 6 | 8, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  6: 'line-clamp-6',
  8: 'line-clamp-8',
};

export function CollapsibleText({
  text,
  as: Tag = 'p',
  className = '',
  collapsedLines = 2,
  defaultExpanded = false,
  stopPropagationOnToggle = false,
  expandLabel = 'Mở rộng xem thêm',
  collapseLabel = 'Thu gọn',
  label,
  canEdit = false,
  allowEmpty = true,
  placeholder,
  onSave,
  disableModal = false,
  stopPropagationOnClick = false,
}: CollapsibleTextProps) {
  const textRef = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [canCollapse, setCanCollapse] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<'view' | 'edit'>('view');

  const editable = Boolean(!disableModal && canEdit && onSave);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      if (!expanded) {
        setCanCollapse(el.scrollHeight > el.clientHeight + 2);
      }
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        measure();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
    return undefined;
  }, [text, collapsedLines, expanded]);

  const clampClass = !expanded ? CLAMP_CLASSES[collapsedLines] : '';

  const openModal = (initialMode: 'view' | 'edit', e: React.MouseEvent) => {
    if (disableModal) return;
    if (stopPropagationOnClick || initialMode === 'edit') {
      e.stopPropagation();
    }
    setModalInitialMode(initialMode);
    setModalOpen(true);
  };

  return (
    <div className={`w-full ${!disableModal ? 'group/ct relative' : ''}`}>
      <Tag
        ref={textRef as React.RefObject<never>}
        onClick={!disableModal ? (e: React.MouseEvent) => openModal('view', e) : undefined}
        title={
          !disableModal
            ? editable
              ? 'Nhấn để mở rộng xem, chỉnh sửa và cập nhật'
              : 'Nhấn để mở rộng xem đầy đủ'
            : undefined
        }
        className={`whitespace-pre-line ${clampClass} ${
          !disableModal
            ? editable
              ? 'cursor-pointer rounded-lg transition-colors duration-150 hover:bg-white/[0.03] group-hover/ct:outline group-hover/ct:outline-1 group-hover/ct:outline-dashed group-hover/ct:outline-[#F02028]/60'
              : 'cursor-pointer rounded-lg transition-colors duration-150 hover:bg-white/[0.03]'
            : ''
        } ${className}`.trim()}
      >
        {text}
      </Tag>

      {editable && (
        <button
          type="button"
          onClick={(e) => openModal('edit', e)}
          aria-label={`Sửa ${label || 'nội dung'}`}
          className="opacity-0 group-hover/ct:opacity-100 focus:opacity-100 absolute -top-2.5 -right-2 z-10 inline-flex items-center gap-1 rounded-md border border-[#F02028]/60 bg-[#171719] px-2 py-0.5 text-[11px] font-medium text-white shadow transition-opacity cursor-pointer"
        >
          <Pencil className="w-3 h-3 text-[#F02028]" />
          <span>Sửa</span>
        </button>
      )}

      {(canCollapse || expanded) && (
        <button
          type="button"
          onClick={(e) => {
            if (stopPropagationOnToggle || !disableModal) {
              e.stopPropagation();
            }
            setExpanded((prev) => !prev);
          }}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:border-[#F02028]/50 hover:text-white transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#F02028]" />
              <span>{collapseLabel}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#F02028]" />
              <span>{expandLabel}</span>
            </>
          )}
        </button>
      )}

      {!disableModal && (
        <TextExpandEditorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          value={text}
          label={label}
          multiline
          placeholder={placeholder}
          canEdit={editable}
          allowEmpty={allowEmpty}
          initialMode={modalInitialMode}
          onSave={onSave}
        />
      )}
    </div>
  );
}
