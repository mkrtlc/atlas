import { useTranslation } from 'react-i18next';
import { useSignSettings, useUpdateSignSettings } from '../../hooks';
import {
  SettingsSection,
  SettingsRow,
} from '../../../../components/settings/settings-primitives';
import { Input } from '../../../../components/ui/input';

export function SignGeneralPanel() {
  const { t } = useTranslation();
  const { data: settings } = useSignSettings();
  const update = useUpdateSignSettings();

  const cadence = settings?.reminderCadenceDays ?? 3;
  const expiry = settings?.signatureExpiryDays ?? 30;

  return (
    <div>
      <SettingsSection title={t('sign.settings.general')}>
        <SettingsRow
          label={t('sign.settings.reminderCadence')}
          description={t('sign.settings.reminderCadenceHelp')}
        >
          <Input
            type="number"
            size="sm"
            min={1}
            max={365}
            value={cadence}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) update.mutate({ reminderCadenceDays: v });
            }}
            style={{ width: 100 }}
          />
        </SettingsRow>

        <SettingsRow
          label={t('sign.settings.signatureExpiry')}
          description={t('sign.settings.signatureExpiryHelp')}
        >
          <Input
            type="number"
            size="sm"
            min={1}
            max={365}
            value={expiry}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) update.mutate({ signatureExpiryDays: v });
            }}
            style={{ width: 100 }}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
