/**
 * LabelPopover
 *
 * Usage:
 *   <LabelPopover threadId={thread.id} currentLabels={thread.labels}>
 *     <button aria-label="Labels">...</button>
 *   </LabelPopover>
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check } from 'lucide-react';
import { useLabelStore } from '../../stores/label-store';
import { useToastStore } from '../../stores/toast-store';
import { useUpdateThreadLabels } from '../../hooks/use-threads';

const COLOR_SWATCHES = [
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#059669',
  '#2563eb',
  '#0891b2',
  '#ec4899',
  '#6b7280',
];

export interface LabelPopoverProps {
  threadId: string;
  currentLabels: string[];
  children: React.ReactNode;
}

interface LabelRowProps {
  name: string;
  color: string;
  checked: boolean;
  onToggle: () => void;
}

function LabelRow({ name, color, checked, onToggle }: LabelRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        border: 'none',
        background: hovered ? 'var(--color-surface-hover)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 'var(--radius-sm)',
        transition: 'background var(--transition-normal)',
      }}
    >
      {/* Color dot */}
      <span
        style={{
          flexShrink: 0,
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
        }}
      />
      {/* Label name */}
      <span
        style={{
          flex: 1,
          fontSize: 'var(--font-size-md)',
          color: 'var(--color-text-primary)',
          lineHeight: 'var(--line-height-tight)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      {/* Checkmark */}
      {checked && (
        <Check
          size={14}
          style={{ flexShrink: 0, color: 'var(--color-accent-primary)' }}
        />
      )}
    </button>
  );
}

export function LabelPopover({ threadId, currentLabels, children }: LabelPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_SWATCHES[0]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');

  const labels = useLabelStore((s) => s.labels);
  const addLabel = useLabelStore((s) => s.addLabel);
  const { addToast } = useToastStore();
  const updateThreadLabels = useUpdateThreadLabels();

  function handleToggle(labelId: string) {
    const next = currentLabels.includes(labelId)
      ? currentLabels.filter((id) => id !== labelId)
      : [...currentLabels, labelId];
    updateThreadLabels.mutate(
      { threadId, labels: next },
      { onSuccess: () => addToast({ type: 'success', message: t('labels.labelUpdated'), duration: 2000 }) },
    );
  }

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const parentId = selectedParentId || null;
    const newId = addLabel(trimmed, selectedColor, parentId);
    const next = [...currentLabels, newId];
    updateThreadLabels.mutate(
      { threadId, labels: next },
      { onSuccess: () => addToast({ type: 'success', message: t('labels.labelCreated'), duration: 2000 }) },
    );
    setNewName('');
    setSelectedColor(COLOR_SWATCHES[0]);
    setSelectedParentId('');
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setNewName('');
      setSelectedColor(COLOR_SWATCHES[0]);
      setSelectedParentId('');
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild>{children}</PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          style={{
            width: '240px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: 'var(--spacing-xs)',
            outline: 'none',
            zIndex: 9999,
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Existing labels list */}
          {labels.length > 0 ? (
            labels.map((label) => (
              <LabelRow
                key={label.id}
                name={label.name}
                color={label.color}
                checked={currentLabels.includes(label.id)}
                onToggle={() => handleToggle(label.id)}
              />
            ))
          ) : (
            <div
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {t('labels.createLabel')}
            </div>
          )}

          {/* Separator */}
          <div
            role="separator"
            aria-orientation="horizontal"
            style={{
              height: '1px',
              background: 'var(--color-border-primary)',
              margin: 'var(--spacing-xs) 0',
            }}
          />

          {/* Create new label section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              {t('labels.createLabel')}
            </span>

            {/* Name input */}
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 24))}
              placeholder={t('labels.labelName')}
              maxLength={24}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') handleOpenChange(false);
              }}
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px var(--spacing-sm)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />

            {/* Parent label */}
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              {t('labels.parentLabel')}
            </span>
            <select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              aria-label={t('labels.parentLabel')}
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px var(--spacing-sm)',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
              }}
            >
              <option value="">{t('labels.noParent')}</option>
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>

            {/* Color swatches */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: color,
                    border: selectedColor === color
                      ? '2px solid var(--color-text-primary)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    outline: 'none',
                    transition: 'border-color var(--transition-normal)',
                  }}
                />
              ))}
            </div>

            {/* Create button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!newName.trim()}
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-inverse)',
                  background: newName.trim()
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-text-tertiary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px var(--spacing-md)',
                  cursor: newName.trim() ? 'pointer' : 'not-allowed',
                  height: '32px',
                  transition: 'background var(--transition-normal)',
                }}
              >
                {t('labels.createLabel')}
              </button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
