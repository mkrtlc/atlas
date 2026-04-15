import { useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox, UserCheck, Edit, Layers, FolderKanban } from 'lucide-react';
import { AppSidebar, SidebarItem, SidebarSection } from '../../../components/layout/app-sidebar';
import { useTaskProjectList } from '../hooks';

export function WorkSidebar() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const activeProjectId = sp.get('projectId');
  const activeView = sp.get('view') ?? 'my';
  const { data: projectsData } = useTaskProjectList();
  const projects = projectsData?.projects ?? [];

  const go = (qs: string) => navigate(`/work${qs}`);

  return (
    <AppSidebar storageKey="atlas_work_sidebar" title="Work">
      <SidebarSection>
        <SidebarItem
          label="My tasks"
          icon={<Inbox size={15} />}
          isActive={activeView === 'my' && !activeProjectId}
          onClick={() => go('')}
        />
        <SidebarItem
          label="Assigned to me"
          icon={<UserCheck size={15} />}
          isActive={activeView === 'assigned' && !activeProjectId}
          onClick={() => go('?view=assigned')}
        />
        <SidebarItem
          label="Created by me"
          icon={<Edit size={15} />}
          isActive={activeView === 'created' && !activeProjectId}
          onClick={() => go('?view=created')}
        />
        <SidebarItem
          label="All tasks"
          icon={<Layers size={15} />}
          isActive={activeView === 'all' && !activeProjectId}
          onClick={() => go('?view=all')}
        />
      </SidebarSection>
      {projects.length > 0 && (
        <SidebarSection title="Projects">
          {projects.map((p) => (
            <SidebarItem
              key={p.id}
              label={p.title}
              icon={<FolderKanban size={15} />}
              isActive={activeProjectId === p.id}
              onClick={() => go(`?projectId=${p.id}`)}
            />
          ))}
        </SidebarSection>
      )}
    </AppSidebar>
  );
}
