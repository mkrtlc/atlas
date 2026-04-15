import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox, FolderKanban, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppSidebar, SidebarItem, SidebarSection } from '../../../components/layout/app-sidebar';

export function WorkSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const activeProjectId = sp.get('projectId');
  const activeView = sp.get('view') ?? 'dashboard';

  const go = (qs: string) => navigate(`/work${qs}`);

  return (
    <AppSidebar storageKey="atlas_work_sidebar" title="Work">
      <SidebarSection>
        <SidebarItem
          label={t('work.sidebar.dashboard')}
          icon={<BarChart3 size={15} />}
          isActive={activeView === 'dashboard' && !activeProjectId}
          onClick={() => go('')}
        />
        <SidebarItem
          label={t('work.sidebar.projects')}
          icon={<FolderKanban size={15} />}
          isActive={activeView === 'projects' || !!activeProjectId}
          onClick={() => go('?view=projects')}
        />
        <SidebarItem
          label={t('work.sidebar.inbox')}
          icon={<Inbox size={15} />}
          isActive={activeView === 'inbox' && !activeProjectId}
          onClick={() => go('?view=inbox')}
        />
      </SidebarSection>
    </AppSidebar>
  );
}
