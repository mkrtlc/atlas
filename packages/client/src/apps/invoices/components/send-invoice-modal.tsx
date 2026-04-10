import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Modal } from '../../../components/ui/modal';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { useSendInvoice, type SendInvoiceResponse } from '../hooks';
import { useToastStore } from '../../../stores/toast-store';

interface SendInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  defaultRecipient?: string;
  companyName?: string;
}

function parseCcEmails(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function SendInvoiceModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  defaultRecipient,
  companyName,
}: SendInvoiceModalProps) {
  const { t } = useTranslation();
  const sendInvoice = useSendInvoice();
  const addToast = useToastStore((s) => s.addToast);

  const [recipient, setRecipient] = useState(defaultRecipient ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [cc, setCc] = useState('');

  useEffect(() => {
    if (open) {
      setRecipient(defaultRecipient ?? '');
      setSubject('');
      setMessage('');
      setCc('');
    }
  }, [open, defaultRecipient]);

  const defaultSubject = t('invoices.send.defaultSubjectPreview', {
    number: invoiceNumber,
    company: companyName ?? '',
  });

  const handleResponse = (data: SendInvoiceResponse) => {
    if (data.emailSent) {
      addToast({
        type: 'success',
        message: t('invoices.send.sendSuccess', { recipient: data.recipient ?? recipient }),
      });
    } else if (data.reason === 'skipped') {
      addToast({ type: 'info', message: t('invoices.send.markedOnly') });
    } else {
      addToast({
        type: 'error',
        message: t('invoices.send.sendFailed', {
          reason: data.reason ?? t('common.error'),
        }),
      });
    }
    onOpenChange(false);
  };

  const handleSendEmail = () => {
    const ccEmails = parseCcEmails(cc);
    sendInvoice.mutate(
      {
        id: invoiceId,
        body: {
          customSubject: subject.trim() || undefined,
          customMessage: message.trim() || undefined,
          ccEmails: ccEmails.length ? ccEmails : undefined,
          skipEmail: false,
        },
      },
      {
        onSuccess: handleResponse,
        onError: () => {
          addToast({ type: 'error', message: t('common.error') });
        },
      },
    );
  };

  const handleMarkOnly = () => {
    sendInvoice.mutate(
      { id: invoiceId, body: { skipEmail: true } },
      {
        onSuccess: handleResponse,
        onError: () => {
          addToast({ type: 'error', message: t('common.error') });
        },
      },
    );
  };

  const isSubmitting = sendInvoice.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      width={520}
      title={t('invoices.send.sendInvoice')}
    >
      <Modal.Header title={t('invoices.send.sendInvoice')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input
            label={t('invoices.send.recipient')}
            placeholder={t('invoices.send.recipientPlaceholder')}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            size="md"
            type="email"
          />
          <Input
            label={t('invoices.send.subjectLabel')}
            placeholder={defaultSubject || t('invoices.send.subjectPlaceholder')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            size="md"
          />
          <Textarea
            label={t('invoices.send.messageLabel')}
            placeholder={t('invoices.send.messagePlaceholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <Input
            label={t('invoices.send.ccLabel')}
            placeholder={t('invoices.send.ccPlaceholder')}
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            size="md"
          />
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
            }}
          >
            {t('invoices.send.pdfAttachedNote')}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          {t('invoices.send.cancelButton')}
        </Button>
        <Button variant="secondary" onClick={handleMarkOnly} disabled={isSubmitting}>
          {t('invoices.send.markOnlyButton')}
        </Button>
        <Button
          variant="primary"
          icon={<Mail size={13} />}
          onClick={handleSendEmail}
          disabled={isSubmitting || !recipient.trim()}
        >
          {t('invoices.send.sendButton')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
