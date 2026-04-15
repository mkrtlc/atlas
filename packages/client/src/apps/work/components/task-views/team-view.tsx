import { useTranslation } from 'react-i18next';
import { WorkTasksView } from '../work-tasks-view';

export function TeamView() {
  const { t } = useTranslation();
  return <WorkTasksView view="all" title={t('work.sidebar.team')} />;
}
