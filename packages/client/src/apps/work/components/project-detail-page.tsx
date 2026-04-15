import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContentArea } from '../../../components/ui/content-area';
import { Tabs } from '../../../components/ui/tabs';
import { Select } from '../../../components/ui/select';
import { useWorkProject, useProjects } from '../hooks';
import type { WorkProject } from '../hooks';
import { ProjectOverviewTab } from './project-overview-tab';
import { ProjectTasksTab } from './project-tasks-tab';
import { ProjectFinancialsTab } from './project-financials-tab';
import { ProjectMembersTab } from './project-members-tab';
import { ProjectTimeTab } from './project-time-tab';
import { ProjectFilesTab } from './project-files-tab';

const TAB_IDS = ['overview', 'tasks', 'financials', 'members', 'time', 'files'] as const;
type TabId = typeof TAB_IDS[number];

interface Props {
  projectId: string;
}

export function ProjectDetailPage({ projectId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabId | null) ?? 'tasks';
  const { data: project, isLoading } = useWorkProject(projectId);
  const { data: projectsData } = useProjects();
  const allProjects = projectsData?.projects ?? [];

  const tabs = TAB_IDS.map((id) => ({ id, label: t(`work.tabs.${id}`) }));

  if (isLoading) {
    return (
      <ContentArea title="">
        <div style={{ padding: 32, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          {t('work.loading')}
        </div>
      </ContentArea>
    );
  }

  if (!project) {
    return (
      <ContentArea>
        <div style={{ padding: 32, color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          {t('work.projectNotFound')}
        </div>
      </ContentArea>
    );
  }

  const setTab = (next: string) => {
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <ContentArea
      headerSlot={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: '0 var(--spacing-lg)', width: '100%', height: '100%' }}>
          <div style={{ flexShrink: 0, minWidth: 180, maxWidth: 280 }}>
            <Select
              size="sm"
              value={projectId}
              onChange={(next) => {
                if (next && next !== projectId) {
                  navigate(`/work?projectId=${next}&tab=${tab}`);
                }
              }}
              options={allProjects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <Tabs tabs={tabs} activeTab={tab} onChange={setTab} paddingX="0" />
        </div>
      }
    >
      {tab === 'overview' && <ProjectOverviewTab project={project as WorkProject} />}
      {tab === 'tasks' && <ProjectTasksTab projectId={projectId} />}
      {tab === 'financials' && <ProjectFinancialsTab projectId={projectId} project={project} />}
      {tab === 'members' && <ProjectMembersTab projectId={projectId} />}
      {tab === 'time' && <ProjectTimeTab projectId={projectId} />}
      {tab === 'files' && <ProjectFilesTab projectId={projectId} />}
    </ContentArea>
  );
}
