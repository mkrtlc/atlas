import { useTranslation } from 'react-i18next';
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSelect,
} from '../../../../components/settings/settings-primitives';
import {
  useWorkSettings,
  useUpdateWorkSettings,
  type WorkWeekStartDay,
  type WorkProjectVisibility,
} from '../../hooks';

export function WorkGeneralPanel() {
  const { t } = useTranslation();
  const { data: settings } = useWorkSettings();
  const update = useUpdateWorkSettings();

  const weekStartDay: WorkWeekStartDay = settings?.weekStartDay ?? 'monday';
  const defaultProjectVisibility: WorkProjectVisibility = settings?.defaultProjectVisibility ?? 'team';
  const defaultBillable = settings?.defaultBillable ?? true;

  const weekStartOptions: Array<{ value: WorkWeekStartDay; label: string }> = [
    { value: 'monday', label: t('work.settings.general.weekStartMonday') },
    { value: 'sunday', label: t('work.settings.general.weekStartSunday') },
    { value: 'saturday', label: t('work.settings.general.weekStartSaturday') },
  ];

  const visibilityOptions: Array<{ value: WorkProjectVisibility; label: string }> = [
    { value: 'team', label: t('work.settings.general.visibilityTeam') },
    { value: 'private', label: t('work.settings.general.visibilityPrivate') },
  ];

  return (
    <div>
      <SettingsSection
        title={t('work.settings.general.timeTitle')}
        description={t('work.settings.general.timeDescription')}
      >
        <SettingsRow
          label={t('work.settings.general.weekStartDay')}
          description={t('work.settings.general.weekStartDayHelp')}
        >
          <SettingsSelect<WorkWeekStartDay>
            value={weekStartDay}
            options={weekStartOptions}
            onChange={(v) => update.mutate({ weekStartDay: v })}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title={t('work.settings.general.projectsTitle')}
        description={t('work.settings.general.projectsDescription')}
      >
        <SettingsRow
          label={t('work.settings.general.defaultProjectVisibility')}
          description={t('work.settings.general.defaultProjectVisibilityHelp')}
        >
          <SettingsSelect<WorkProjectVisibility>
            value={defaultProjectVisibility}
            options={visibilityOptions}
            onChange={(v) => update.mutate({ defaultProjectVisibility: v })}
          />
        </SettingsRow>
        <SettingsRow
          label={t('work.settings.general.defaultBillable')}
          description={t('work.settings.general.defaultBillableHelp')}
        >
          <SettingsToggle
            checked={defaultBillable}
            onChange={(v) => update.mutate({ defaultBillable: v })}
            label={t('work.settings.general.defaultBillable')}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
