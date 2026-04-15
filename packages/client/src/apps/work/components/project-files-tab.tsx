import { FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../../../components/ui/skeleton';
import { IconButton } from '../../../components/ui/icon-button';
import { formatDate, formatBytes } from '../../../lib/format';
import { ROUTES } from '../../../config/routes';

// Drive items linked to this project come from record links.
// For now we use a simple placeholder view — full integration wired in Task 13+.
interface DriveItem {
  id: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  updatedAt: string;
}

interface Props {
  projectId: string;
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  return <FileText size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />;
}

// Minimal hook — queries drive items linked to this project via record links.
// Returns an empty array until Drive <> Work linking is wired (Task 13+).
function useProjectFiles(_projectId: string): { data: DriveItem[] | undefined; isLoading: boolean } {
  // TODO(Task 13+): fetch via /work/projects/projects/:id/files or record_links
  return { data: [], isLoading: false };
}

export function ProjectFilesTab({ projectId }: Props) {
  const navigate = useNavigate();
  const { data: files, isLoading } = useProjectFiles(projectId);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={44} borderRadius="var(--radius-md)" />)}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--color-text-tertiary)' }}>
        <FileText size={32} />
        <span style={{ fontSize: 'var(--font-size-sm)' }}>No files linked to this project</span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
          Link files from Drive to make them appear here
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 860 }}>
      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
        {files.length} {files.length === 1 ? 'file' : 'files'}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {files.map((file) => (
          <div
            key={file.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-secondary)',
            }}
          >
            <FileIcon mimeType={file.mimeType} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {file.size != null ? formatBytes(file.size) : ''}{file.size != null ? ' · ' : ''}
                {formatDate(file.updatedAt)}
              </div>
            </div>
            <IconButton
              icon={<ExternalLink size={13} />}
              label="Open in Drive"
              size={24}
              onClick={() => navigate(ROUTES.DRIVE)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
