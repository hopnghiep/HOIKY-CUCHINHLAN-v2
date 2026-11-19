import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleTextProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  className?: string;
  collapsedLines?: 2 | 3 | 4 | 6 | 8;
  defaultExpanded?: boolean;
  stopPropagationOnToggle?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
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
}: CollapsibleTextProps) {
  const textRef = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [canCollapse, setCanCollapse] = useState(false);

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

  return (
    <div className="w-full">
      <Tag
        ref={textRef as React.RefObject<never>}
        className={`whitespace-pre-line ${clampClass} ${className}`.trim()}
      >
        {text}
      </Tag>

      {(canCollapse || expanded) && (
        <button
          type="button"
          onClick={(e) => {
            if (stopPropagationOnToggle) {
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
    </div>
  );
}
