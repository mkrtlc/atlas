import { useTranslation } from 'react-i18next';
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
} from '../../../../components/settings/settings-primitives';
import { useTasksSettingsStore } from '../../settings-store';

export function WorkAppearancePanel() {
  const { t } = useTranslation();
  const s = useTasksSettingsStore();

  return (
    <div>
      <SettingsSection
        title={t('work.settings.appearance.layoutTitle')}
        description={t('work.settings.appearance.layoutDescription')}
      >
        <SettingsRow
          label={t('work.settings.appearance.compactMode')}
          description={t('work.settings.appearance.compactModeHelp')}
        >
          <SettingsToggle
            checked={s.compactMode}
            onChange={s.setCompactMode}
            label={t('work.settings.appearance.compactMode')}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t('work.settings.appearance.visibilityTitle')}>
        <SettingsRow
          label={t('work.settings.appearance.showWhenBadges')}
          description={t('work.settings.appearance.showWhenBadgesHelp')}
        >
          <SettingsToggle
            checked={s.showWhenBadges}
            onChange={s.setShowWhenBadges}
            label={t('work.settings.appearance.showWhenBadges')}
          />
        </SettingsRow>
        <SettingsRow
          label={t('work.settings.appearance.showProjectInList')}
          description={t('work.settings.appearance.showProjectInListHelp')}
        >
          <SettingsToggle
            checked={s.showProjectInList}
            onChange={s.setShowProjectInList}
            label={t('work.settings.appearance.showProjectInList')}
          />
        </SettingsRow>
        <SettingsRow
          label={t('work.settings.appearance.showNotesIndicator')}
          description={t('work.settings.appearance.showNotesIndicatorHelp')}
        >
          <SettingsToggle
            checked={s.showNotesIndicator}
            onChange={s.setShowNotesIndicator}
            label={t('work.settings.appearance.showNotesIndicator')}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t('work.settings.appearance.todayTitle')}>
        <SettingsRow
          label={t('work.settings.appearance.showEveningSection')}
          description={t('work.settings.appearance.showEveningSectionHelp')}
        >
          <SettingsToggle
            checked={s.showEveningSection}
            onChange={s.setShowEveningSection}
            label={t('work.settings.appearance.showEveningSection')}
          />
        </SettingsRow>
        <SettingsRow
          label={t('work.settings.appearance.showCalendarInToday')}
          description={t('work.settings.appearance.showCalendarInTodayHelp')}
        >
          <SettingsToggle
            checked={s.showCalendarInToday}
            onChange={s.setShowCalendarInToday}
            label={t('work.settings.appearance.showCalendarInToday')}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
