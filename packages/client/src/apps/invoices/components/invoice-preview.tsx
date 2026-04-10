import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useInvoice, useInvoiceSettings } from '../hooks';
import { formatCurrency, formatDate } from '../../../lib/format';
import { api } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { useToastStore } from '../../../stores/toast-store';
import { getInvoiceStatusVariant } from '@atlasmail/shared';
import { Badge } from '../../../components/ui/badge';

interface InvoicePreviewProps {
  invoiceId: string;
  onClose: () => void;
}

export function InvoicePreview({ invoiceId, onClose }: InvoicePreviewProps) {
  const { t } = useTranslation();
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: settings } = useInvoiceSettings();
  const addToast = useToastStore((s) => s.addToast);

  const handleDownloadPdf = async () => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice?.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      addToast({ type: 'error', message: t('common.error') });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !invoice) {
    return (
      <div className="invoice-preview-overlay">
        <div className="preview-toolbar">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  const lineItems = invoice.lineItems ?? [];
  const companyName = settings?.eFaturaCompanyName || '';
  const companyAddress = settings?.eFaturaCompanyAddress || '';
  const companyCity = settings?.eFaturaCompanyCity || '';
  const companyCountry = settings?.eFaturaCompanyCountry || '';
  const companyTaxId = settings?.eFaturaCompanyTaxId || '';
  const companyPhone = settings?.eFaturaCompanyPhone || '';
  const companyEmail = settings?.eFaturaCompanyEmail || '';

  return (
    <div className="invoice-preview-overlay">
      <style>{`
        .invoice-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          background: var(--color-bg-tertiary);
          overflow: hidden;
        }

        .preview-toolbar {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--color-bg-primary);
          border-bottom: 1px solid var(--color-border-secondary);
          flex-shrink: 0;
        }

        .preview-toolbar-spacer {
          flex: 1;
        }

        .preview-scroll-area {
          flex: 1;
          overflow: auto;
          padding: var(--spacing-2xl);
          display: flex;
          justify-content: center;
        }

        .preview-paper {
          background: #fff;
          width: 100%;
          max-width: 800px;
          min-height: 1100px;
          box-shadow: var(--shadow-lg);
          border-radius: var(--radius-md);
          padding: 48px;
          color: #1a1a1a;
          font-family: var(--font-family);
          font-size: 13px;
          line-height: 1.5;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .preview-company-name {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .preview-invoice-title {
          font-size: 28px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .preview-company-info {
          color: #6b7280;
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .preview-divider {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 24px 0;
        }

        .preview-meta-section {
          display: flex;
          gap: 48px;
          margin-bottom: 32px;
        }

        .preview-meta-left,
        .preview-meta-right {
          flex: 1;
        }

        .preview-meta-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .preview-meta-value {
          font-size: 13px;
          color: #1a1a1a;
          line-height: 1.6;
        }

        .preview-meta-value strong {
          font-weight: 600;
        }

        .preview-meta-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
        }

        .preview-meta-row-label {
          color: #6b7280;
          font-size: 12px;
        }

        .preview-meta-row-value {
          font-size: 13px;
          color: #1a1a1a;
          font-weight: 500;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }

        .preview-table thead th {
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 10px 12px;
          border-bottom: 2px solid #e5e7eb;
        }

        .preview-table thead th:nth-child(2),
        .preview-table thead th:nth-child(3),
        .preview-table thead th:nth-child(4) {
          text-align: right;
        }

        .preview-table tbody td {
          padding: 10px 12px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
          color: #1a1a1a;
        }

        .preview-table tbody tr:nth-child(even) {
          background: #fafafa;
        }

        .preview-table tbody td:nth-child(2),
        .preview-table tbody td:nth-child(3),
        .preview-table tbody td:nth-child(4) {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .preview-totals {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }

        .preview-totals-table {
          width: 260px;
        }

        .preview-totals-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          color: #4b5563;
        }

        .preview-totals-row.total-row {
          border-top: 2px solid #e5e7eb;
          margin-top: 6px;
          padding-top: 10px;
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .preview-notes {
          margin-bottom: 32px;
        }

        .preview-notes-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
        }

        .preview-notes-text {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .preview-footer {
          margin-top: auto;
          padding-top: 24px;
          border-top: 1px solid #f3f4f6;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
        }

        @media print {
          .preview-toolbar {
            display: none !important;
          }
          .invoice-preview-overlay {
            background: white;
          }
          .preview-scroll-area {
            padding: 0;
            overflow: visible;
          }
          .preview-paper {
            box-shadow: none;
            border-radius: 0;
            margin: 0;
            max-width: none;
            min-height: auto;
          }
        }

        @media (max-width: 640px) {
          .preview-paper {
            padding: 24px;
          }
          .preview-meta-section {
            flex-direction: column;
            gap: 24px;
          }
          .preview-header {
            flex-direction: column;
            gap: 12px;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="preview-toolbar">
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onClose}>
          {t('common.close')}
        </Button>
        <div className="preview-toolbar-spacer" />
        <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={handleDownloadPdf}>
          {t('invoices.downloadPdf')}
        </Button>
        <Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={handlePrint}>
          {t('invoices.print')}
        </Button>
      </div>

      {/* Paper */}
      <div className="preview-scroll-area">
        <div className="preview-paper">
          {/* Header */}
          <div className="preview-header">
            <div className="preview-company-name">{companyName || 'Company'}</div>
            <div className="preview-invoice-title">INVOICE</div>
          </div>

          {/* Company info */}
          {(companyAddress || companyCity || companyCountry || companyTaxId || companyPhone || companyEmail) && (
            <div className="preview-company-info">
              {companyAddress && <div>{companyAddress}</div>}
              {(companyCity || companyCountry) && (
                <div>{[companyCity, companyCountry].filter(Boolean).join(', ')}</div>
              )}
              {companyTaxId && <div>Tax ID: {companyTaxId}</div>}
              {companyPhone && <div>{companyPhone}</div>}
              {companyEmail && <div>{companyEmail}</div>}
            </div>
          )}

          <hr className="preview-divider" />

          {/* Meta section */}
          <div className="preview-meta-section">
            <div className="preview-meta-left">
              <div className="preview-meta-label">{t('invoices.billTo')}</div>
              <div className="preview-meta-value">
                {invoice.companyName && <div><strong>{invoice.companyName}</strong></div>}
                {invoice.contactName && <div>{invoice.contactName}</div>}
                {invoice.contactEmail && <div>{invoice.contactEmail}</div>}
              </div>
            </div>
            <div className="preview-meta-right">
              <div className="preview-meta-row">
                <span className="preview-meta-row-label">{t('invoices.list.invoiceNumber')}</span>
                <span className="preview-meta-row-value">{invoice.invoiceNumber}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-meta-row-label">{t('invoices.list.issueDate')}</span>
                <span className="preview-meta-row-value">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-meta-row-label">{t('invoices.list.dueDate')}</span>
                <span className="preview-meta-row-value">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="preview-meta-row">
                <span className="preview-meta-row-label">{t('invoices.list.status')}</span>
                <span className="preview-meta-row-value">
                  <Badge variant={getInvoiceStatusVariant(invoice.status)}>
                    {t(`invoices.status.${invoice.status}`)}
                  </Badge>
                </span>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <table className="preview-table">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>{t('invoices.detail.lineItems')}</th>
                <th>{t('invoices.list.items')}</th>
                <th>Unit price</th>
                <th>{t('invoices.list.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => (
                <tr key={li.id || i}>
                  <td>{li.description}</td>
                  <td>{li.quantity}</td>
                  <td>{formatCurrency(li.unitPrice)}</td>
                  <td>{formatCurrency((li.quantity ?? 0) * (li.unitPrice ?? 0))}</td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                    {t('invoices.detail.lineItems')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="preview-totals">
            <div className="preview-totals-table">
              <div className="preview-totals-row">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxPercent > 0 && (
                <div className="preview-totals-row">
                  <span>Tax ({invoice.taxPercent}%)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              {invoice.discountPercent > 0 && (
                <div className="preview-totals-row">
                  <span>Discount ({invoice.discountPercent}%)</span>
                  <span>-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              <div className="preview-totals-row total-row">
                <span>{t('invoices.list.totalAmount')}</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="preview-notes">
              <div className="preview-notes-label">{t('invoices.notes')}</div>
              <div className="preview-notes-text">{invoice.notes}</div>
            </div>
          )}

          {/* Footer */}
          <div className="preview-footer">
            {companyName && <span>{companyName}</span>}
            {companyEmail && <span> &middot; {companyEmail}</span>}
            {companyPhone && <span> &middot; {companyPhone}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
