import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/modal';
import { Button } from '../../../../components/ui/button';

interface NewFolderModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderName: string;
  setFolderName: (v: string) => void;
  onSubmit: () => void;
}

export function NewFolderModal({
  open,
  onOpenChange,
  folderName,
  setFolderName,
  onSubmit,
}: NewFolderModalProps) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onOpenChange={onOpenChange} width={400} title={t('drive.modals.newFolder')}>
      <Modal.Header title={t('drive.modals.newFolder')} />
      <Modal.Body>
        <input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder={t('drive.modals.folderName')}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'var(--font-family)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t('drive.modals.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={!folderName.trim()}
        >
          {t('drive.modals.create')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
