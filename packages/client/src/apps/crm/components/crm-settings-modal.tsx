import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  SettingsSection,
  SettingsRow,
} from '../../../components/settings/settings-primitives';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { IconButton } from '../../../components/ui/icon-button';
import { useStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages } from '../hooks';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { CrmDealStage } from '@atlasmail/shared';

const STAGE_COLORS = [
  '#6b7280', '#3b82f6', '#f59e0b', '#f97316', '#10b981',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6',
];

// ─── Sortable Stage Row ───────────────────────────────────────────

function SortableStageRow({
  stage,
  isEditing,
  editName,
  editColor,
  onStartEdit,
  onEditNameChange,
  onEditColorChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  stage: CrmDealStage;
  isEditing: boolean;
  editName: string;
  editColor: string;
  onStartEdit: () => void;
  onEditNameChange: (v: string) => void;
  onEditColorChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: '8px var(--spacing-sm)',
    borderRadius: 'var(--radius-md)',
    background: isEditing ? 'var(--color-bg-tertiary)' : isDragging ? 'var(--color-surface-hover)' : 'transparent',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--color-text-tertiary)' }}
      >
        <GripVertical size={14} />
      </div>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: isEditing ? editColor : stage.color, flexShrink: 0 }} />

      {isEditing ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Input
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            size="sm"
            style={{ flex: 1 }}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && onSaveEdit()}
          />
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {STAGE_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Select color ${c}`}
                onClick={() => onEditColorChange(c)}
                style={{
                  width: 16, height: 16, borderRadius: '50%', background: c,
                  border: editColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={onSaveEdit}>Save</Button>
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>Cancel</Button>
        </div>
      ) : (
        <>
          <span
            style={{ flex: 1, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
            onClick={onStartEdit}
          >
            {stage.name}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', minWidth: 30, textAlign: 'right' }}>
            {stage.probability}%
          </span>
          <IconButton icon={<Trash2 size={12} />} label="Delete stage" size={24} destructive onClick={onDelete} />
        </>
      )}
    </div>
  );
}

// ─── Stages Panel ──────────────────────────────────────────────────

export function CrmStagesPanel() {
  const { data: stagesData } = useStages();
  const stages = stagesData?.stages ?? [];
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#6b7280');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const startEdit = (stage: CrmDealStage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditColor(stage.color);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateStage.mutate({ id: editingId, name: editName.trim(), color: editColor });
      setEditingId(null);
    }
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    createStage.mutate({ name: newName.trim(), color: newColor }, {
      onSuccess: () => {
        setNewName('');
        setNewColor('#6b7280');
        setShowAdd(false);
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(stages, oldIndex, newIndex);
    reorderStages.mutate(reordered.map((s) => s.id));
  };

  return (
    <div>
      <SettingsSection title="Pipeline stages" description="Drag to reorder. Click a stage name to edit.">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              {stages.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  isEditing={editingId === stage.id}
                  editName={editName}
                  editColor={editColor}
                  onStartEdit={() => startEdit(stage)}
                  onEditNameChange={setEditName}
                  onEditColorChange={setEditColor}
                  onSaveEdit={saveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  onDelete={() => deleteStage.mutate(stage.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {showAdd ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '8px var(--spacing-sm)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)', marginTop: 'var(--spacing-xs)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: newColor, flexShrink: 0 }} />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Stage name"
              size="sm"
              style={{ flex: 1 }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {STAGE_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  aria-label={`Select color ${c}`}
                  onClick={() => setNewColor(c)}
                  style={{
                    width: 16, height: 16, borderRadius: '50%', background: c,
                    border: newColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewName(''); }}>Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)} style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-xs)' }}>
            Add stage
          </Button>
        )}
      </SettingsSection>
    </div>
  );
}

// ─── General Panel ─────────────────────────────────────────────────

export function CrmGeneralPanel() {
  return (
    <div>
      <SettingsSection title="General">
        <SettingsRow label="Default view" description="Which section to show when opening CRM">
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>Pipeline</span>
        </SettingsRow>
        <SettingsRow label="Currency" description="Currency symbol used for deal values">
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>$ (USD)</span>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
