import { Users } from 'lucide-react';
import { useProjectMembers } from '../hooks';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatDate } from '../../../lib/format';
import { formatCurrency } from '../../../lib/format';

interface Props {
  projectId: string;
}

export function ProjectMembersTab({ projectId }: Props) {
  const { data: members, isLoading } = useProjectMembers(projectId);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {[1, 2, 3].map((i) => <Skeleton key={i} height={48} borderRadius="var(--radius-md)" />)}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', color: 'var(--color-text-tertiary)' }}>
        <Users size={32} />
        <span style={{ fontSize: 'var(--font-size-sm)' }}>No members added yet</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
        <Users size={15} style={{ color: 'var(--color-text-tertiary)' }} />
        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {members.map((member) => (
          <div
            key={member.id}
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
            <Avatar
              name={member.userName || member.userEmail || 'Unknown'}
              size={32}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.userName || 'Unknown user'}
              </div>
              {member.userEmail && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.userEmail}
                </div>
              )}
            </div>
            {member.hourlyRate != null && (
              <Badge variant="default">
                {formatCurrency(member.hourlyRate)}/h
              </Badge>
            )}
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
              Joined {formatDate(member.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
