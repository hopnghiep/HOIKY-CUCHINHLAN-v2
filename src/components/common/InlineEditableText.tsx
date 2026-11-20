import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import { CollapsibleText } from './CollapsibleText';
import { TextExpandEditorModal } from './TextExpandEditorModal';

interface InlineEditableTextProps {
  value: string;
  onSave?: (nextValue: string) => void | Promise<unknown>;
  canEdit?: boolean;
  allowEmpty?: boolean;
  emptyDisplay?: string;
  multiline?: boolean;
  collapsible?: boolean;
  collapsedLines?: 2 | 3 | 4 | 6 | 8;
  textareaRows?: number;
  inline?: boolean;
  stopPropagation?: boolean;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  label?: string;
}

export function InlineEditableText({
  value,
  onSave,
  canEdit,
  allowEmpty = false,
  emptyDisplay,
  multiline = false,
  collapsible,
  collapsedLines = 2,
  inline,
  stopPropagation = false,
  as: Tag = 'p',
  className = '',
  placeholder = 'Nhập nội dung...',
  label,
}: InlineEditableTextProps) {
  const { isAdmin } = useMemoir();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<'view' | 'edit'>('view');

  const effectiveCanEdit = Boolean((canEdit ?? isAdmin) && onSave);
  const isCollapsible = collapsible ?? multiline;
  const isInline = inline ?? (Tag === 'span' && !multiline && !isCollapsible);
  const displayedText = value || emptyDisplay || '';

  const openModal = (initialMode: 'view' | 'edit', e: React.MouseEvent) => {
    if (stopPropagation || initialMode === 'edit') {
      e.stopPropagation();
    }
    setModalInitialMode(initialMode);
    setModalOpen(true);
  };

  const Wrapper = isInline ? 'span' : 'div';

  if (!effectiveCanEdit) {
    return (
      <>
        <Wrapper
          onClick={(e) => openModal('view', e)}
          title="Nhấn để mở rộng xem đầy đủ"
          className={`cursor-pointer rounded-lg transition-colors duration-150 hover:bg-white/[0.03] ${
            isInline ? 'inline-block' : 'w-full'
          }`}
        >
          {isCollapsible ? (
            <CollapsibleText
              as={Tag}
              text={displayedText}
              collapsedLines={collapsedLines}
              className={className}
              stopPropagationOnToggle
              disableModal
            />
          ) : (
            <Tag className={className}>{displayedText}</Tag>
          )}
        </Wrapper>

        <TextExpandEditorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          value={value}
          label={label}
          multiline={multiline}
          placeholder={placeholder}
          emptyDisplay={emptyDisplay}
          canEdit={false}
          allowEmpty={allowEmpty}
          initialMode="view"
        />
      </>
    );
  }

  return (
    <>
      <Wrapper className={`group/iet relative ${isInline ? 'inline-block' : 'inline-block w-full'}`}>
        <Wrapper
          onClick={(e) => openModal('view', e)}
          title="Nhấn để mở rộng xem, sửa chữa và cập nhật"
          className={`cursor-pointer rounded-lg transition-colors duration-150 group-hover/iet:outline group-hover/iet:outline-1 group-hover/iet:outline-dashed group-hover/iet:outline-[#F02028]/70 group-hover/iet:bg-white/[0.03] ${
            isInline ? 'inline-block' : 'block w-full'
          }`}
        >
          {isCollapsible ? (
            <CollapsibleText
              as={Tag}
              text={displayedText}
              collapsedLines={collapsedLines}
              className={className}
              stopPropagationOnToggle
              disableModal
            />
          ) : (
            <Tag className={className}>{displayedText}</Tag>
          )}
        </Wrapper>
        <button
          type="button"
          onClick={(e) => openModal('edit', e)}
          aria-label={`Sửa ${label || 'nội dung'}`}
          className="opacity-0 group-hover/iet:opacity-100 focus:opacity-100 absolute -top-2.5 -right-2 z-10 inline-flex items-center gap-1 rounded-md border border-[#F02028]/60 bg-[#171719] px-2 py-0.5 text-[11px] font-medium text-white shadow transition-opacity cursor-pointer"
        >
          <Pencil className="w-3 h-3 text-[#F02028]" />
          <span>Sửa</span>
        </button>
      </Wrapper>

      <TextExpandEditorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        value={value}
        label={label}
        multiline={multiline}
        placeholder={placeholder}
        emptyDisplay={emptyDisplay}
        canEdit={effectiveCanEdit}
        allowEmpty={allowEmpty}
        initialMode={modalInitialMode}
        onSave={onSave}
      />
    </>
  );
}
