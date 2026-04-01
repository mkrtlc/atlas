import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Trash2, CheckSquare, ChevronDown } from 'lucide-react';
import type { SignatureField, SignatureFieldType } from '@atlasmail/shared';

// ─── Color map ──────────────────────────────────────────────────────

const FIELD_COLORS: Record<SignatureFieldType, { border: string; bg: string; label: string }> = {
  signature: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)', label: 'Signature' },
  initials: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)', label: 'Initials' },
  date: { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)', label: 'Date' },
  text: { border: '#6b7280', bg: 'rgba(107, 114, 128, 0.08)', label: 'Text' },
  checkbox: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', label: 'Checkbox' },
  dropdown: { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.08)', label: 'Dropdown' },
  name: { border: '#0891b2', bg: 'rgba(8, 145, 178, 0.08)', label: 'Name' },
  email: { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)', label: 'Email' },
};

// ─── Types ──────────────────────────────────────────────────────────

interface FieldOverlayProps {
  fields: SignatureField[];
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  onFieldMove?: (id: string, x: number, y: number) => void;
  onFieldResize?: (id: string, w: number, h: number) => void;
  onFieldClick?: (id: string) => void;
  onFieldDelete?: (id: string) => void;
  selectedFieldId?: string;
  highlightFieldId?: string;
  editable?: boolean;
  /** Enable click-to-sign on fields without enabling drag/resize (for public signing) */
  signable?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export function FieldOverlay({
  fields,
  pageNumber,
  pageWidth,
  pageHeight,
  onFieldMove,
  onFieldResize,
  onFieldClick,
  onFieldDelete,
  selectedFieldId,
  highlightFieldId,
  editable = false,
  signable = false,
}: FieldOverlayProps) {
  const pageFields = fields.filter((f) => f.pageNumber === pageNumber);

  return (
    <>
      {pageFields.map((field) => (
        <FieldBox
          key={field.id}
          field={field}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          isSelected={selectedFieldId === field.id}
          isHighlighted={highlightFieldId === field.id}
          editable={editable}
          signable={signable}
          onMove={onFieldMove}
          onResize={onFieldResize}
          onClick={onFieldClick}
          onDelete={onFieldDelete}
        />
      ))}
    </>
  );
}

// ─── Individual field box ───────────────────────────────────────────

interface FieldBoxProps {
  field: SignatureField;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  isHighlighted?: boolean;
  editable: boolean;
  signable?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function FieldBox({
  field,
  pageWidth,
  pageHeight,
  isSelected,
  isHighlighted = false,
  editable,
  signable = false,
  onMove,
  onResize,
  onClick,
  onDelete,
}: FieldBoxProps) {
  const colors = FIELD_COLORS[field.type] || FIELD_COLORS.text;
  const boxRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; fieldX: number; fieldY: number; hasMoved: boolean } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; fieldW: number; fieldH: number; hasResized: boolean } | null>(null);

  // Local drag/resize offsets for smooth visual feedback
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number } | null>(null);
  const [resizeOffset, setResizeOffset] = useState<{ dw: number; dh: number } | null>(null);

  // Pixel positions from percentage-based x/y/width/height
  const baseLeft = (field.x / 100) * pageWidth;
  const baseTop = (field.y / 100) * pageHeight;
  const baseWidth = (field.width / 100) * pageWidth;
  const baseHeight = (field.height / 100) * pageHeight;

  // Apply local drag/resize offsets for smooth visual movement
  const left = dragOffset ? baseLeft + dragOffset.dx : baseLeft;
  const top = dragOffset ? baseTop + dragOffset.dy : baseTop;
  const width = resizeOffset ? Math.max(baseWidth + resizeOffset.dw, (3 / 100) * pageWidth) : baseWidth;
  const height = resizeOffset ? Math.max(baseHeight + resizeOffset.dh, (2 / 100) * pageHeight) : baseHeight;

  const isInteractive = editable || signable;

  // ─── Drag handler ─────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (!editable || !onMove) return;
      // Don't preventDefault here — let click events fire for selection
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        fieldX: field.x,
        fieldY: field.y,
        hasMoved: false,
      };

      const pW = pageWidth;
      const pH = pageHeight;
      const fW = field.width;
      const fH = field.height;
      const fId = field.id;

      function handleMouseMove(ev: globalThis.MouseEvent) {
        if (!dragState.current) return;
        dragState.current.hasMoved = true;
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        setDragOffset({ dx, dy });
      }

      function handleMouseUp(ev: globalThis.MouseEvent) {
        if (dragState.current && dragState.current.hasMoved) {
          const dx = ev.clientX - dragState.current.startX;
          const dy = ev.clientY - dragState.current.startY;
          const newX = dragState.current.fieldX + (dx / pW) * 100;
          const newY = dragState.current.fieldY + (dy / pH) * 100;
          onMove!(fId, Math.max(0, Math.min(100 - fW, newX)), Math.max(0, Math.min(100 - fH, newY)));
        }
        dragState.current = null;
        setDragOffset(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [editable, onMove, field.id, field.x, field.y, field.width, field.height, pageWidth, pageHeight],
  );

  // ─── Resize handler ───────────────────────────────────────────────

  const handleResizeMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (!editable || !onResize) return;
      e.preventDefault();
      e.stopPropagation();
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        fieldW: field.width,
        fieldH: field.height,
        hasResized: false,
      };

      const pW = pageWidth;
      const pH = pageHeight;
      const fX = field.x;
      const fY = field.y;
      const fId = field.id;

      function handleMouseMove(ev: globalThis.MouseEvent) {
        if (!resizeState.current) return;
        resizeState.current.hasResized = true;
        const dx = ev.clientX - resizeState.current.startX;
        const dy = ev.clientY - resizeState.current.startY;
        setResizeOffset({ dw: dx, dh: dy });
      }

      function handleMouseUp(ev: globalThis.MouseEvent) {
        if (resizeState.current && resizeState.current.hasResized) {
          const dx = ev.clientX - resizeState.current.startX;
          const dy = ev.clientY - resizeState.current.startY;
          const newW = resizeState.current.fieldW + (dx / pW) * 100;
          const newH = resizeState.current.fieldH + (dy / pH) * 100;
          onResize!(fId, Math.max(3, Math.min(100 - fX, newW)), Math.max(2, Math.min(100 - fY, newH)));
        }
        resizeState.current = null;
        setResizeOffset(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [editable, onResize, field.id, field.x, field.y, field.width, field.height, pageWidth, pageHeight],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      dragState.current = null;
      resizeState.current = null;
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className="sign-field"
      data-field-id={field.id}
      onMouseDown={editable ? handleMouseDown : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (isInteractive) {
          onClick?.(field.id);
        }
      }}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: `2px ${isSelected || isHighlighted ? 'solid' : 'dashed'} ${colors.border}`,
        background: isHighlighted ? `${colors.border}20` : colors.bg,
        borderRadius: 'var(--radius-sm)',
        cursor: editable ? 'move' : isInteractive ? 'pointer' : 'default',
        pointerEvents: isInteractive ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: dragOffset || resizeOffset ? 'none' : 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        boxShadow: isHighlighted ? `0 0 0 3px ${colors.border}40, 0 0 12px ${colors.border}30` : 'none',
        animation: isHighlighted ? 'sign-field-pulse 1.5s ease-in-out infinite' : 'none',
        zIndex: dragOffset || resizeOffset ? 100 : undefined,
      }}
    >
      {/* Field content: signature image, checkbox, dropdown, or label */}
      {field.type === 'checkbox' ? (
        <CheckSquare
          size={Math.min(width, height) * 0.6}
          style={{
            color: field.signatureData === 'checked' ? colors.border : `${colors.border}40`,
            pointerEvents: 'none',
          }}
        />
      ) : field.type === 'dropdown' ? (
        field.signatureData ? (
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
              fontWeight: 500,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {field.signatureData}
          </span>
        ) : (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--font-size-xs)',
              color: colors.border,
              fontFamily: 'var(--font-family)',
              fontWeight: 500,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {colors.label}
            <ChevronDown size={12} />
          </span>
        )
      ) : field.signatureData ? (
        <img
          src={field.signatureData}
          alt="Signature"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: colors.border,
            fontFamily: 'var(--font-family)',
            fontWeight: 500,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {colors.label}
        </span>
      )}

      {/* Delete button (top-right, visible on hover or select) */}
      {editable && (
        <button
          className="sign-field-delete-btn"
          aria-label="Delete field"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(field.id);
          }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--color-error)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            zIndex: 10,
            opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.15s',
            pointerEvents: isSelected ? 'auto' : 'none',
          }}
        >
          <Trash2 size={10} />
        </button>
      )}

      {/* Resize handle (bottom-right corner) */}
      {editable && isSelected && (
        <div
          onMouseDown={handleResizeMouseDown}
          style={{
            position: 'absolute',
            right: -4,
            bottom: -4,
            width: 8,
            height: 8,
            background: colors.border,
            borderRadius: 'var(--radius-sm)',
            cursor: 'nwse-resize',
            zIndex: 10,
          }}
        />
      )}
    </div>
  );
}
