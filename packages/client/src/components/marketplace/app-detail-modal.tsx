import { Modal } from '../ui/modal';
import { ExternalLink, Cpu, HardDrive, Database } from 'lucide-react';
import type { CatalogApp } from '@atlasmail/shared';

interface AppDetailModalProps {
  app: CatalogApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (app: CatalogApp) => void;
  isInstalled?: boolean;
}

export function AppDetailModal({ app, open, onOpenChange, onInstall, isInstalled }: AppDetailModalProps) {
  if (!app) return null;

  const manifest = app.manifest as any;

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={560} title={app.name}>
      <Modal.Header title={app.name} subtitle={`v${app.currentVersion} · ${app.category}`}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: app.color || '#4A90E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {app.iconUrl ? (
              <img src={app.iconUrl} alt="" style={{ width: 32, height: 32 }} />
            ) : (
              <ExternalLink size={26} color="#fff" />
            )}
          </div>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Description */}
          <p style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {app.description}
          </p>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {app.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Resource requirements */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            padding: 16,
            background: 'var(--color-bg-tertiary)',
            borderRadius: 10,
          }}>
            <ResourceItem
              icon={<Cpu size={16} />}
              label="CPU"
              value={`${manifest?.resources?.cpuMillicores ?? '?'}m`}
            />
            <ResourceItem
              icon={<HardDrive size={16} />}
              label="Memory"
              value={`${manifest?.resources?.memoryMb ?? '?'} MB`}
            />
            <ResourceItem
              icon={<Database size={16} />}
              label="Storage"
              value={`${manifest?.resources?.storageMb ?? '?'} MB`}
            />
          </div>

          {/* Addons */}
          {manifest?.addons && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                Required services
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {manifest.addons.postgresql && <AddonBadge label="PostgreSQL" />}
                {manifest.addons.redis && <AddonBadge label="Redis" />}
                {manifest.addons.smtp && <AddonBadge label="SMTP" />}
                {manifest.addons.s3 && <AddonBadge label="S3" />}
              </div>
            </div>
          )}

          {/* Min plan */}
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Minimum plan: <strong style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{app.minPlan}</strong>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => onOpenChange(false)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid var(--color-border-primary)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onInstall(app)}
            disabled={isInstalled}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: isInstalled ? 'var(--color-bg-tertiary)' : '#13715B',
              color: isInstalled ? 'var(--color-text-tertiary)' : '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isInstalled ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-family)',
            }}
          >
            {isInstalled ? 'Installed' : 'Install'}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

function ResourceItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ color: 'var(--color-text-tertiary)' }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function AddonBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 12,
      padding: '4px 10px',
      borderRadius: 6,
      background: 'var(--color-bg-quaternary)',
      color: 'var(--color-text-secondary)',
      fontWeight: 500,
      border: '1px solid var(--color-border-primary)',
    }}>
      {label}
    </span>
  );
}
