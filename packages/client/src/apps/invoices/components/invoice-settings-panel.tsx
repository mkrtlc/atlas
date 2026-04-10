import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvoiceSettings, useUpdateInvoiceSettings } from '../hooks';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import type { UpdateInvoiceSettingsInput } from '@atlasmail/shared';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'TRY', label: 'TRY - Turkish Lira' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
];

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
};

const sectionBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--spacing-lg)',
  padding: 'var(--spacing-lg)',
  background: 'var(--color-bg-secondary)',
  borderRadius: 'var(--radius-md)',
};

export function InvoiceSettingsPanel() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useInvoiceSettings();
  const updateSettings = useUpdateInvoiceSettings();

  const [form, setForm] = useState<UpdateInvoiceSettingsInput>({});
  const [dirty, setDirty] = useState(false);

  const templates = [
    { id: 'classic', name: t('invoices.settings.classic'), description: t('invoices.settings.classicDescription') },
    { id: 'modern', name: t('invoices.settings.modern'), description: t('invoices.settings.modernDescription') },
    { id: 'compact', name: t('invoices.settings.compact'), description: t('invoices.settings.compactDescription') },
  ];

  useEffect(() => {
    if (settings) {
      setForm({
        invoicePrefix: settings.invoicePrefix,
        defaultCurrency: settings.defaultCurrency,
        defaultTaxRate: settings.defaultTaxRate,
        eFaturaEnabled: settings.eFaturaEnabled,
        eFaturaCompanyName: settings.eFaturaCompanyName ?? '',
        eFaturaCompanyTaxId: settings.eFaturaCompanyTaxId ?? '',
        eFaturaCompanyTaxOffice: settings.eFaturaCompanyTaxOffice ?? '',
        eFaturaCompanyAddress: settings.eFaturaCompanyAddress ?? '',
        eFaturaCompanyCity: settings.eFaturaCompanyCity ?? '',
        eFaturaCompanyCountry: settings.eFaturaCompanyCountry ?? '',
        eFaturaCompanyPhone: settings.eFaturaCompanyPhone ?? '',
        eFaturaCompanyEmail: settings.eFaturaCompanyEmail ?? '',
        templateId: settings.templateId ?? 'classic',
        accentColor: settings.accentColor ?? '#13715B',
        companyName: settings.companyName ?? '',
        companyAddress: settings.companyAddress ?? '',
        companyCity: settings.companyCity ?? '',
        companyCountry: settings.companyCountry ?? '',
        companyPhone: settings.companyPhone ?? '',
        companyEmail: settings.companyEmail ?? '',
        companyWebsite: settings.companyWebsite ?? '',
        companyTaxId: settings.companyTaxId ?? '',
        paymentInstructions: settings.paymentInstructions ?? '',
        bankDetails: settings.bankDetails ?? '',
        footerText: settings.footerText ?? '',
      });
      setDirty(false);
    }
  }, [settings]);

  const update = (patch: Partial<UpdateInvoiceSettingsInput>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(form, { onSuccess: () => setDirty(false) });
  };

  if (isLoading) return <></>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', maxWidth: 480 }}>
      <Input
        label={t('invoices.settings.invoicePrefix')}
        value={form.invoicePrefix ?? ''}
        onChange={(e) => update({ invoicePrefix: e.target.value })}
        size="sm"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
          {t('invoices.settings.defaultCurrency')}
        </label>
        <Select
          value={form.defaultCurrency ?? 'USD'}
          onChange={(val) => update({ defaultCurrency: val })}
          options={CURRENCY_OPTIONS}
          size="sm"
        />
      </div>

      <Input
        label={t('invoices.settings.defaultTaxRate')}
        type="number"
        step="0.1"
        value={String(form.defaultTaxRate ?? 0)}
        onChange={(e) => update({ defaultTaxRate: parseFloat(e.target.value) || 0 })}
        size="sm"
      />

      {/* Template selector */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.template')}</span>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => update({ templateId: tpl.id })}
              style={{
                flex: 1,
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-primary)',
                border: `2px solid ${form.templateId === tpl.id ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-family)',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
                {tpl.name}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {tpl.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.accentColor')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <input
            type="color"
            value={form.accentColor ?? '#13715B'}
            onChange={(e) => update({ accentColor: e.target.value })}
            style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
          />
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
            {form.accentColor ?? '#13715B'}
          </span>
        </div>
      </div>

      {/* Company details */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.companyDetails')}</span>
        <Input
          label={t('invoices.settings.companyName')}
          value={form.companyName ?? ''}
          onChange={(e) => update({ companyName: e.target.value })}
          size="sm"
        />
        <Input
          label={t('invoices.settings.companyAddress')}
          value={form.companyAddress ?? ''}
          onChange={(e) => update({ companyAddress: e.target.value })}
          size="sm"
        />
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Input
            label={t('invoices.settings.companyCity')}
            value={form.companyCity ?? ''}
            onChange={(e) => update({ companyCity: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyCountry')}
            value={form.companyCountry ?? ''}
            onChange={(e) => update({ companyCountry: e.target.value })}
            size="sm"
          />
        </div>
        <Input
          label={t('invoices.settings.companyPhone')}
          value={form.companyPhone ?? ''}
          onChange={(e) => update({ companyPhone: e.target.value })}
          size="sm"
        />
        <Input
          label={t('invoices.settings.companyEmail')}
          value={form.companyEmail ?? ''}
          onChange={(e) => update({ companyEmail: e.target.value })}
          size="sm"
        />
        <Input
          label={t('invoices.settings.companyWebsite')}
          value={form.companyWebsite ?? ''}
          onChange={(e) => update({ companyWebsite: e.target.value })}
          size="sm"
        />
        <Input
          label={t('invoices.settings.companyTaxId')}
          value={form.companyTaxId ?? ''}
          onChange={(e) => update({ companyTaxId: e.target.value })}
          size="sm"
        />
      </div>

      {/* Payment info */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.payment')}</span>
        <Textarea
          label={t('invoices.settings.paymentInstructions')}
          value={form.paymentInstructions ?? ''}
          onChange={(e) => update({ paymentInstructions: e.target.value })}
          rows={3}
        />
        <Textarea
          label={t('invoices.settings.bankDetails')}
          value={form.bankDetails ?? ''}
          onChange={(e) => update({ bankDetails: e.target.value })}
          rows={3}
        />
      </div>

      {/* Footer */}
      <div style={sectionBoxStyle}>
        <span style={sectionLabelStyle}>{t('invoices.settings.footer')}</span>
        <Textarea
          label={t('invoices.settings.footerText')}
          value={form.footerText ?? ''}
          onChange={(e) => update({ footerText: e.target.value })}
          rows={2}
        />
      </div>

      {/* E-Fatura toggle */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', color: 'var(--color-text-primary)' }}>
          <input
            type="checkbox"
            checked={form.eFaturaEnabled ?? false}
            onChange={(e) => update({ eFaturaEnabled: e.target.checked })}
          />
          {t('invoices.settings.eFatura')}
        </label>
      </div>

      {/* E-Fatura company details */}
      {form.eFaturaEnabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)' }}>
            {t('invoices.settings.companyDetails')}
          </span>
          <Input
            label={t('invoices.settings.companyName')}
            value={form.eFaturaCompanyName ?? ''}
            onChange={(e) => update({ eFaturaCompanyName: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyTaxId')}
            value={form.eFaturaCompanyTaxId ?? ''}
            onChange={(e) => update({ eFaturaCompanyTaxId: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyTaxOffice')}
            value={form.eFaturaCompanyTaxOffice ?? ''}
            onChange={(e) => update({ eFaturaCompanyTaxOffice: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyAddress')}
            value={form.eFaturaCompanyAddress ?? ''}
            onChange={(e) => update({ eFaturaCompanyAddress: e.target.value })}
            size="sm"
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Input
              label={t('invoices.settings.companyCity')}
              value={form.eFaturaCompanyCity ?? ''}
              onChange={(e) => update({ eFaturaCompanyCity: e.target.value })}
              size="sm"
            />
            <Input
              label={t('invoices.settings.companyCountry')}
              value={form.eFaturaCompanyCountry ?? ''}
              onChange={(e) => update({ eFaturaCompanyCountry: e.target.value })}
              size="sm"
            />
          </div>
          <Input
            label={t('invoices.settings.companyPhone')}
            value={form.eFaturaCompanyPhone ?? ''}
            onChange={(e) => update({ eFaturaCompanyPhone: e.target.value })}
            size="sm"
          />
          <Input
            label={t('invoices.settings.companyEmail')}
            value={form.eFaturaCompanyEmail ?? ''}
            onChange={(e) => update({ eFaturaCompanyEmail: e.target.value })}
            size="sm"
          />
        </div>
      )}

      {dirty && (
        <div>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={updateSettings.isPending}>
            {t('common.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
