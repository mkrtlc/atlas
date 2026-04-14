import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, Check, AlertCircle } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

interface LinkInfo {
  mode: string;
  folderName: string;
  instructions: string | null;
  requireEmail: boolean;
  passwordProtected: boolean;
}

export function DriveUploadPublicPage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<Array<{ name: string; size: number }>>([]);

  useEffect(() => {
    fetch(`/api/v1/share/${token}/info`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) setError(j.error);
        else setInfo(j.data);
      })
      .catch(() => setError('Failed to load link'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('name', name);
    fd.append('email', email);
    for (const f of files) fd.append('files', f);
    try {
      const r = await fetch(`/api/v1/share/${token}/upload`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!j.success) setError(j.error);
      else {
        setUploaded((prev) => [...prev, ...j.data.uploaded]);
        setFiles([]);
      }
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--color-error)', marginBottom: 16 }} />
        <div style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>{error}</div>
      </div>
    );
  }
  if (!info) return <div style={{ padding: 40, textAlign: 'center' }}>{t('common.loading', 'Loading...')}</div>;

  return (
    <div style={{ maxWidth: 520, margin: '48px auto', padding: 'var(--spacing-xl)', fontFamily: 'var(--font-family)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', marginBottom: 8 }}>
        {t('drive.upload.heading', { folder: info.folderName })}
      </h1>
      {info.instructions && (
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>{info.instructions}</p>
      )}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {info.requireEmail && (
          <>
            <Input label={t('drive.upload.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label={t('drive.upload.emailLabel')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </>
        )}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: 40,
            border: '2px dashed var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            gap: 8,
          }}
        >
          <Upload size={24} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {files.length > 0 ? t('drive.upload.filesChosen', { count: files.length }) : t('drive.upload.chooseFiles')}
          </span>
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>
        <Button type="submit" variant="primary" size="md" disabled={files.length === 0 || uploading}>
          {uploading ? t('drive.upload.uploading') : t('drive.upload.submit')}
        </Button>
      </form>
      {uploaded.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--color-success)' }}>
            <Check size={16} />
            <strong>{t('drive.upload.successTitle')}</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {uploaded.map((u, i) => (
              <li key={i} style={{ fontSize: 'var(--font-size-sm)' }}>
                {u.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
