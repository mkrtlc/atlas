import { useState } from 'react';
import { Modal } from '../ui/modal';
import { ExternalLink, Cpu, HardDrive, Database, Trash2 } from 'lucide-react';
import type { CatalogApp, AtlasManifest } from '@atlasmail/shared';
import { AppIcon } from './app-icons';

interface AppDetailModalProps {
  app: CatalogApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: (app: CatalogApp) => void;
  onUninstall?: (app: CatalogApp) => void;
  isInstalled?: boolean;
  isUninstalling?: boolean;
}

export function AppDetailModal({ app, open, onOpenChange, onInstall, onUninstall, isInstalled, isUninstalling }: AppDetailModalProps) {
  const [confirmUninstall, setConfirmUninstall] = useState(false);

  if (!app) return null;

  const manifest = app.manifest as AtlasManifest;

  const handleOpenChange = (value: boolean) => {
    if (!value) setConfirmUninstall(false);
    onOpenChange(value);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange} width={560} title={app.name}>
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
            {app.manifestId ? <AppIcon manifestId={app.manifestId} size={32} color="#fff" /> : <ExternalLink size={26} color="#fff" />}
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
        {confirmUninstall ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <div style={{
              padding: 12,
              background: '#FFF3F3',
              borderRadius: 8,
              fontSize: 13,
              color: '#D32F2F',
              lineHeight: 1.5,
            }}>
              This will permanently remove {app.name} and all its data including databases and files. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmUninstall(false)}
                disabled={isUninstalling}
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
                onClick={() => {
                  onUninstall?.(app);
                  setConfirmUninstall(false);
                }}
                disabled={isUninstalling}
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#D32F2F',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isUninstalling ? 'not-allowed' : 'pointer',
                  opacity: isUninstalling ? 0.7 : 1,
                  fontFamily: 'var(--font-family)',
                }}
              >
                {isUninstalling ? 'Uninstalling...' : 'Yes, uninstall'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
            {isInstalled && onUninstall && (
              <button
                onClick={() => setConfirmUninstall(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #FFCDD2',
                  background: 'transparent',
                  color: '#D32F2F',
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                  marginRight: 'auto',
                }}
              >
                <Trash2 size={14} />
                Uninstall
              </button>
            )}
            <button
              onClick={() => handleOpenChange(false)}
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
              Close
            </button>
            {!isInstalled && (
              <button
                onClick={() => onInstall(app)}
                style={{
                  padding: '8px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#13715B',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-family)',
                }}
              >
                Install
              </button>
            )}
          </div>
        )}
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
