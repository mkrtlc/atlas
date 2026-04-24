import { useTranslation } from 'react-i18next';
import {
  SettingsSection,
  SettingsRow,
  SettingsSelect,
  SettingsToggle,
} from '../../../components/settings/settings-primitives';
import { useHrSettingsStore } from '../settings-store';

// ---------------------------------------------------------------------------
// Panel: General
// ---------------------------------------------------------------------------

export function HrGeneralPanel() {
  const { t } = useTranslation();
  const { defaultView, setDefaultView } = useHrSettingsStore();

  return (
    <SettingsSection title={t('hr.settings.general')}>
      <SettingsRow label={t('hr.settings.defaultView')} description={t('hr.settings.defaultViewDesc')}>
        <SettingsSelect
          value={defaultView}
          options={[
            { value: 'dashboard', label: t('hr.sidebar.dashboard') },
            { value: 'employees', label: t('hr.sidebar.allEmployees') },
            { value: 'departments', label: t('hr.sidebar.departments') },
            { value: 'org-chart', label: t('hr.sidebar.orgChart') },
            { value: 'time-off', label: t('hr.sidebar.timeOff') },
            { value: 'attendance', label: t('hr.sidebar.attendance') },
            { value: 'leave', label: t('hr.sidebar.leaveSection') },
            { value: 'expenses', label: t('hr.sidebar.expensesSection', 'Expenses') },
            { value: 'my-profile', label: t('hr.sidebar.myProfile') },
          ]}
          onChange={setDefaultView}
        />
      </SettingsRow>
    </SettingsSection>
  );
}

// ---------------------------------------------------------------------------
// Panel: Appearance
// ---------------------------------------------------------------------------

export function HrAppearancePanel() {
  const { t } = useTranslation();
  const { showDepartmentInList, setShowDepartmentInList } = useHrSettingsStore();

  return (
    <SettingsSection title={t('hr.settings.display')}>
      <SettingsRow label={t('hr.settings.showDepartmentInList')} description={t('hr.settings.showDepartmentInListDesc')}>
        <SettingsToggle
          checked={showDepartmentInList}
          onChange={setShowDepartmentInList}
          label={t('hr.settings.showDepartmentInList')}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
