import { useState } from 'react';
import { Modal } from '../ui/modal';
import type { CatalogApp } from '@atlasmail/shared';

interface InstallConfirmModalProps {
  app: CatalogApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (subdomain: string) => void;
  isLoading?: boolean;
  tenantSlug?: string;
}

export function InstallConfirmModal({
  app,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  tenantSlug,
}: InstallConfirmModalProps) {
  const [subdomain, setSubdomain] = useState('');

  if (!app) return null;

  const defaultSubdomain = app.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  const handleConfirm = () => {
    onConfirm(subdomain || defaultSubdomain);
  };

  const previewUrl = `${subdomain || defaultSubdomain}.${tenantSlug || 'your-org'}.atlas.so`;

  return (
    <Modal open={open} onOpenChange={onOpenChange} width={460} title={`Install ${app.name}`}>
      <Modal.Header title={`Install ${app.name}`} />

      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginBottom: 6,
              }}
            >
              Subdomain
            </label>
            <input
              type="text"
              placeholder={defaultSubdomain}
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--color-border-primary)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontSize: 14,
                outline: 'none',
                fontFamily: 'var(--font-family)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{
            padding: 12,
            background: 'var(--color-bg-tertiary)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--color-text-secondary)',
          }}>
            Your app will be available at:<br />
            <strong style={{ color: 'var(--color-text-primary)' }}>https://{previewUrl}</strong>
          </div>

          <div style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            lineHeight: 1.5,
          }}>
            This will provision a dedicated instance of {app.name} for your organization.
            {app.manifest && (app.manifest as any).addons?.postgresql && ' A PostgreSQL database will be automatically created.'}
            {app.manifest && (app.manifest as any).addons?.redis && ' A Redis cache will be provisioned.'}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
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
            onClick={handleConfirm}
            disabled={isLoading}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: '#13715B',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              fontFamily: 'var(--font-family)',
            }}
          >
            {isLoading ? 'Installing...' : 'Confirm install'}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
