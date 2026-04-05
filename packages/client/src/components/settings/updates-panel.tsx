import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { api } from '../../lib/api-client';
import { Button } from '../ui/button';
import { AlertBanner } from '../ui/alert-banner';
import {
  SettingsSection,
  SettingsRow,
} from './settings-primitives';

export function UpdatesPanel() {
  const { t } = useTranslation();
  const [checkResult, setCheckResult] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');

  const { data: status } = useQuery({
    queryKey: ['updates', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/updates/status');
      return data.data as { autoUpdateEnabled: boolean; watchtowerReachable: boolean };
    },
    staleTime: 30_000,
  });

  const checkNow = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/updates/check');
      return data;
    },
    onMutate: () => setCheckResult('checking'),
    onSuccess: () => setCheckResult('success'),
    onError: () => setCheckResult('error'),
  });

  const autoUpdateEnabled = status?.autoUpdateEnabled ?? false;
  const watchtowerReachable = status?.watchtowerReachable ?? false;

  return (
    <div>
      <SettingsSection
        title={t('settings.updates.title', 'Updates')}
        description={t('settings.updates.desc', 'Manage automatic updates for Atlas')}
      >
        <SettingsRow
          label={t('settings.updates.autoUpdate', 'Auto-update')}
          description={t('settings.updates.autoUpdateDesc', 'Automatically check for and install updates')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            {autoUpdateEnabled ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-success)',
                fontFamily: 'var(--font-family)',
              }}>
                <CheckCircle2 size={14} />
                {t('settings.updates.enabled', 'Enabled')}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}>
                <XCircle size={14} />
                {t('settings.updates.disabled', 'Disabled')}
              </span>
            )}
          </div>
        </SettingsRow>

        {autoUpdateEnabled && (
          <SettingsRow
            label={t('settings.updates.schedule', 'Schedule')}
            description={t('settings.updates.scheduleDesc', 'Updates are checked and applied automatically')}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-family)',
            }}>
              <Clock size={14} />
              {t('settings.updates.nightly', 'Nightly (3:00 AM)')}
            </span>
          </SettingsRow>
        )}

        <SettingsRow
          label={t('settings.updates.checkNow', 'Check for updates')}
          description={t('settings.updates.checkNowDesc', 'Manually check if a newer version is available')}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={13} className={checkResult === 'checking' ? 'tables-spin' : undefined} />}
            onClick={() => checkNow.mutate()}
            disabled={checkResult === 'checking'}
          >
            {checkResult === 'checking'
              ? t('settings.updates.checking', 'Checking...')
              : t('settings.updates.checkButton', 'Check now')}
          </Button>
        </SettingsRow>

        {checkResult === 'success' && (
          <AlertBanner variant="success">
            {t('settings.updates.checkSuccess', 'Update check complete. If a new version is available it will be applied automatically.')}
          </AlertBanner>
        )}

        {checkResult === 'error' && (
          <AlertBanner variant="warning">
            {t('settings.updates.checkError', 'Could not reach the update service. Make sure auto-update is enabled in your Docker Compose configuration.')}
          </AlertBanner>
        )}
      </SettingsSection>

      {!autoUpdateEnabled && (
        <SettingsSection title={t('settings.updates.howToEnable', 'How to enable')}>
          <AlertBanner variant="info">
            {t('settings.updates.enableInstructions', 'To enable automatic updates, start Docker Compose with the auto-update profile:')}
          </AlertBanner>
          <div style={{
            marginTop: 'var(--spacing-sm)',
            padding: 'var(--spacing-md)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            overflowX: 'auto',
          }}>
            docker compose --profile auto-update -f docker-compose.production.yml up -d
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
