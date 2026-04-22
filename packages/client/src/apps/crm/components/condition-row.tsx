import type { StepCondition, StepConditionOperator } from '../hooks';
import { Select } from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { IconButton } from '../../../components/ui/icon-button';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CONDITION_FIELD_TYPES, TRIGGER_AVAILABLE_FIELDS, type WorkflowTrigger } from '@atlas-platform/shared';

interface ConditionRowProps {
  trigger: WorkflowTrigger;
  value: StepCondition;
  onChange: (next: StepCondition) => void;
  onRemove: () => void;
}

const OPERATORS_BY_TYPE: Record<'number' | 'string' | 'string[]', StepConditionOperator[]> = {
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_empty', 'is_not_empty'],
  string: ['eq', 'neq', 'contains', 'not_contains', 'is_empty', 'is_not_empty'],
  'string[]': ['contains', 'not_contains', 'is_empty', 'is_not_empty'],
};

export function ConditionRow({ trigger, value, onChange, onRemove }: ConditionRowProps) {
  const { t } = useTranslation();
  const availableFields = TRIGGER_AVAILABLE_FIELDS[trigger] ?? [];
  const fieldOptions = availableFields.map((f) => ({ value: f, label: t(`crm.automations.editor.fields.${f.replace(/\./g, '_')}`, f) }));

  const fieldType = CONDITION_FIELD_TYPES[value.field] ?? 'string';
  const operatorOptions = OPERATORS_BY_TYPE[fieldType].map((op) => ({
    value: op,
    label: t(`crm.automations.editor.operators.${op}`),
  }));

  const hideValueInput = value.operator === 'is_empty' || value.operator === 'is_not_empty';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
      <Select
        size="sm"
        value={value.field}
        onChange={(v) => onChange({ ...value, field: v })}
        options={fieldOptions}
      />
      <Select
        size="sm"
        value={value.operator}
        onChange={(v) => onChange({ ...value, operator: v as StepConditionOperator })}
        options={operatorOptions}
      />
      {!hideValueInput && (
        <Input
          size="sm"
          value={value.value === null ? '' : String(value.value)}
          onChange={(e) => {
            const raw = e.target.value;
            const parsed = fieldType === 'number' ? (raw === '' ? null : Number(raw)) : raw;
            onChange({ ...value, value: parsed });
          }}
          type={fieldType === 'number' ? 'number' : 'text'}
        />
      )}
      <IconButton icon={<X size={14} />} label={t('crm.automations.editor.removeCondition')} onClick={onRemove} />
    </div>
  );
}
