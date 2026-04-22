import { useState, useCallback } from 'react';
import { GripVertical, MoreVertical, Trash2, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { ConditionRow } from './condition-row';
import type { CrmWorkflowStep, StepCondition, CrmDealStage } from '../hooks';
import type { WorkflowTrigger } from '@atlas-platform/shared';

interface StepCardProps {
  step: CrmWorkflowStep;
  position: number; // 1-indexed badge
  trigger: WorkflowTrigger;
  stages: CrmDealStage[];
  canDelete: boolean;
  onChange: (patch: Partial<{ action: string; actionConfig: Record<string, unknown>; condition: StepCondition | null }>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function StepCard(props: StepCardProps) {
  const { t } = useTranslation();
  const { step, position, trigger, stages, canDelete, onChange, onDuplicate, onDelete } = props;
  const [menuOpen, setMenuOpen] = useState(false);

  const actionOptions = [
    { value: 'create_task', label: t('crm.automations.actionCreateTask') },
    { value: 'update_field', label: t('crm.automations.actionUpdateField') },
    { value: 'change_deal_stage', label: t('crm.automations.actionChangeDealStage') },
    { value: 'add_tag', label: t('crm.automations.actionAddTag') },
    { value: 'assign_user', label: t('crm.automations.actionAssignUser') },
    { value: 'log_activity', label: t('crm.automations.actionLogActivity') },
    { value: 'send_notification', label: t('crm.automations.actionSendNotification') },
  ];

  const config = step.actionConfig ?? {};
  const setConfig = (patch: Record<string, unknown>) => onChange({ actionConfig: { ...config, ...patch } });

  const addCondition = useCallback(() => {
    const firstField = trigger === 'deal_stage_changed' ? 'deal.value' : 'deal.value';
    onChange({ condition: { field: firstField, operator: 'eq', value: null } });
  }, [trigger, onChange]);

  return (
    <div
      draggable
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
      style={{
        border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-md)',
        background: 'var(--color-bg-primary)',
        display: 'flex',
        gap: 'var(--spacing-sm)',
      }}
    >
      <div style={{ cursor: 'grab', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'flex-start', paddingTop: 4 }}>
        <GripVertical size={14} />
      </div>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-xs)', fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
        {position}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <Select size="sm" value={step.action} onChange={(v) => onChange({ action: v, actionConfig: {} })} options={actionOptions} />

        {step.action === 'create_task' && (
          <Input size="sm" placeholder={t('crm.automations.taskTitlePlaceholder')} value={(config.taskTitle as string) ?? ''} onChange={(e) => setConfig({ taskTitle: e.target.value })} />
        )}

        {step.action === 'update_field' && (
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Select size="sm" value={(config.fieldName as string) ?? 'probability'} onChange={(v) => setConfig({ fieldName: v })} options={[
              { value: 'probability', label: t('crm.deals.probability') },
              { value: 'value', label: t('crm.deals.value') },
              { value: 'title', label: t('crm.deals.title') },
            ]} />
            <Input size="sm" placeholder={t('crm.automations.newValuePlaceholder')} value={(config.fieldValue as string) ?? ''} onChange={(e) => setConfig({ fieldValue: e.target.value })} />
          </div>
        )}

        {step.action === 'change_deal_stage' && (
          <Select size="sm" value={(config.newStageId as string) ?? ''} onChange={(v) => setConfig({ newStageId: v })} options={stages.map((s) => ({ value: s.id, label: s.name }))} />
        )}

        {step.action === 'add_tag' && (
          <Input size="sm" placeholder={t('crm.automations.tagPlaceholder')} value={(config.tag as string) ?? ''} onChange={(e) => setConfig({ tag: e.target.value })} />
        )}

        {step.action === 'assign_user' && (
          <Input size="sm" placeholder={t('crm.automations.userIdPlaceholder')} value={(config.assignedUserId as string) ?? ''} onChange={(e) => setConfig({ assignedUserId: e.target.value })} />
        )}

        {step.action === 'log_activity' && (
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexDirection: 'column' }}>
            <Select size="sm" value={(config.activityType as string) ?? 'note'} onChange={(v) => setConfig({ activityType: v })} options={[
              { value: 'note', label: t('crm.activities.note') },
              { value: 'call', label: t('crm.activities.call') },
              { value: 'meeting', label: t('crm.activities.meeting') },
              { value: 'email', label: t('crm.activities.email') },
            ]} />
            <Input size="sm" placeholder={t('crm.automations.activityBodyPlaceholder')} value={(config.body as string) ?? ''} onChange={(e) => setConfig({ body: e.target.value })} />
          </div>
        )}

        {step.action === 'send_notification' && (
          <Input size="sm" placeholder={t('crm.automations.notificationPlaceholder')} value={(config.message as string) ?? ''} onChange={(e) => setConfig({ message: e.target.value })} />
        )}

        {step.condition ? (
          <ConditionRow trigger={trigger} value={step.condition} onChange={(c) => onChange({ condition: c })} onRemove={() => onChange({ condition: null })} />
        ) : (
          <Button variant="ghost" size="sm" onClick={addCondition}>{t('crm.automations.editor.addFilter')}</Button>
        )}
      </div>

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--color-text-tertiary)' }}><MoreVertical size={14} /></button>
        </PopoverTrigger>
        <PopoverContent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
            <button onClick={() => { onDuplicate(); setMenuOpen(false); }} style={{ textAlign: 'left', padding: 'var(--spacing-sm)', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Copy size={12} /> {t('crm.automations.editor.duplicateStep')}
            </button>
            <button disabled={!canDelete} onClick={() => { if (canDelete) { onDelete(); setMenuOpen(false); } }} style={{ textAlign: 'left', padding: 'var(--spacing-sm)', border: 'none', background: 'none', cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.4, display: 'flex', gap: 6, alignItems: 'center', color: 'var(--color-error)' }}>
              <Trash2 size={12} /> {t('crm.automations.editor.deleteStep')}
            </button>
            {!canDelete && (
              <div style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {t('crm.automations.editor.lastStepTooltip')}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
