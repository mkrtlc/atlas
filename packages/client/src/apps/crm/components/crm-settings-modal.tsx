import { useState, useEffect } from 'react';
import {
  SettingsSection,
  SettingsRow,
} from '../../../components/settings/settings-primitives';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { IconButton } from '../../../components/ui/icon-button';
import { useStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages, type CrmDealStage } from '../hooks';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';

// ─── Color Presets ─────────────────────────────────────────────────

const STAGE_COLORS = [
  '#6b7280', '#3b82f6', '#f59e0b', '#f97316', '#10b981',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6',
];

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

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = stages.map((s) => s.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorderStages.mutate(ids);
  };

  const handleMoveDown = (index: number) => {
    if (index >= stages.length - 1) return;
    const ids = stages.map((s) => s.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorderStages.mutate(ids);
  };

  return (
    <div>
      <SettingsSection title="Pipeline stages" description="Configure the stages of your deal pipeline">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: '8px var(--spacing-sm)',
                borderRadius: 'var(--radius-md)',
                background: editingId === stage.id ? 'var(--color-bg-tertiary)' : 'transparent',
              }}
            >
              <GripVertical size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: editingId === stage.id ? editColor : stage.color, flexShrink: 0 }} />

              {editingId === stage.id ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    size="sm"
                    style={{ flex: 1 }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  />
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {STAGE_COLORS.map((c) => (
                      <button
                        key={c}
                        aria-label={`Select color ${c}`}
                        onClick={() => setEditColor(c)}
                        style={{
                          width: 16, height: 16, borderRadius: '50%', background: c, border: editColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0,
                        }}
                      />
                    ))}
                  </div>
                  <Button variant="primary" size="sm" onClick={saveEdit}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <span
                    style={{ flex: 1, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                    onClick={() => startEdit(stage)}
                  >
                    {stage.name}
                  </span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', minWidth: 30, textAlign: 'right' }}>
                    {stage.probability}%
                  </span>
                  <IconButton icon={<ChevronUp size={12} />} label="Move up" size={24} onClick={() => handleMoveUp(index)} />
                  <IconButton icon={<ChevronDown size={12} />} label="Move down" size={24} onClick={() => handleMoveDown(index)} />
                  <IconButton icon={<Trash2 size={12} />} label="Delete stage" size={24} destructive onClick={() => deleteStage.mutate(stage.id)} />
                </>
              )}
            </div>
          ))}

          {showAdd ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '8px var(--spacing-sm)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)' }}>
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
                      width: 16, height: 16, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--color-text-primary)' : '2px solid transparent', cursor: 'pointer', padding: 0,
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
        </div>
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
