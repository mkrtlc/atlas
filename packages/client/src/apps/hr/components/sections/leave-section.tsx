import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useLeaveBalances, useAllocateLeave } from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { IconButton } from '../../../../components/ui/icon-button';

export function LeaveBalanceSection({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation();
  const { data: balances } = useLeaveBalances(employeeId);
  const allocateLeave = useAllocateLeave();
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocType, setAllocType] = useState('vacation');
  const [allocDays, setAllocDays] = useState('');

  const year = new Date().getFullYear();

  const handleAllocate = () => {
    if (!allocDays) return;
    allocateLeave.mutate(
      { employeeId, leaveType: allocType, year, days: parseInt(allocDays) },
      { onSuccess: () => { setShowAllocate(false); setAllocDays(''); } },
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
        <span className="hr-section-title">{t('hr.leaveBalance.title')}</span>
        <IconButton icon={<Plus size={12} />} label={t('hr.leaveBalance.allocate')} size={24} onClick={() => setShowAllocate(!showAllocate)} />
      </div>

      {showAllocate && (
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
          <Select
            value={allocType}
            onChange={setAllocType}
            options={[
              { value: 'vacation', label: t('hr.leaveType.vacation') },
              { value: 'sick', label: t('hr.leaveType.sick') },
              { value: 'personal', label: t('hr.leaveType.personal') },
            ]}
            size="sm"
          />
          <Input
            value={allocDays}
            onChange={(e) => setAllocDays(e.target.value)}
            placeholder={t('hr.leaveBalance.days')}
            type="number"
            size="sm"
            style={{ width: 80 }}
          />
          <Button variant="primary" size="sm" onClick={handleAllocate} disabled={!allocDays}>
            {t('common.save')}
          </Button>
        </div>
      )}

      {(!balances || balances.length === 0) ? (
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
          {t('hr.leaveBalance.noBalances')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          {balances.map((b) => {
            const remaining = b.allocated + b.carried - b.used;
            return (
              <div key={b.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px var(--spacing-sm)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)',
              }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                  {b.leaveType}
                </span>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                  <span>{b.allocated} {t('hr.leaveBalance.allocated')}</span>
                  <span>{b.used} {t('hr.leaveBalance.used')}</span>
                  <span style={{ color: remaining > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 'var(--font-weight-semibold)' }}>
                    {remaining} {t('hr.leaveBalance.remaining')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
