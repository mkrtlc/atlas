import { WorkTasksView } from './work-tasks-view';

interface Props {
  projectId: string;
}

export function ProjectTasksTab({ projectId }: Props) {
  return (
    <WorkTasksView
      view={`project:${projectId}`}
      title="Tasks"
    />
  );
}
