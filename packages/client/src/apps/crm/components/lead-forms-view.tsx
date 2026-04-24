import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Copy, Trash2, Check, Globe, ToggleLeft, ToggleRight, FileText,
  ChevronUp, ChevronDown, ArrowLeft, Type, Mail, Phone,
  AlignLeft, ListFilter, Eye, Palette,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { Modal } from '../../../components/ui/modal';
import { Badge } from '../../../components/ui/badge';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { useToastStore } from '../../../stores/toast-store';
import { api } from '../../../lib/api-client';
import {
  useLeadForms, useCreateLeadForm, useUpdateLeadForm, useDeleteLeadForm,
  type CrmLeadForm, type LeadFormField, type LeadFormFieldType,
} from '../hooks';

// ─── Constants ──────────────────────────────────────────────────────

const FIELD_TYPE_OPTIONS: { value: LeadFormFieldType; label: string; icon: typeof Type }[] = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'textarea', label: 'Long text', icon: AlignLeft },
  { value: 'select', label: 'Dropdown', icon: ListFilter },
];

const MAP_TO_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'name', label: 'Lead name' },
  { value: 'email', label: 'Lead email' },
  { value: 'phone', label: 'Lead phone' },
  { value: 'companyName', label: 'Company name' },
  { value: 'message', label: 'Notes / message' },
];

function generateId(): string {
  return 'f' + Math.random().toString(36).slice(2, 10);
}

// ─── Helpers ────────────────────────────────────────────────────────

function getServerUrl(): string {
  return import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
}

/**
 * Inline embed: a self-contained `<form>` using the form's token branding
 * (accent colour, border, radius, font, button label). This snippet lives
 * directly inside the host page, so we can't inject the user's custom CSS
 * here — it would bleed into the host site. Use the iframe snippet below
 * for full styling.
 */
function generateEmbedCode(form: CrmLeadForm): string {
  const serverUrl = getServerUrl();
  const url = `${serverUrl}/api/v1/crm/forms/public/${form.token}`;
  const font = form.fontFamily && form.fontFamily !== 'inherit'
    ? `${form.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const fieldHtml = form.fields.map((field) => {
    const req = field.required ? ' required' : '';
    const star = field.required ? ' <span style="color:#ef4444">*</span>' : '';
    const label = `    <label style="display:block;margin-bottom:4px;font-size:14px;font-weight:500;color:#111318">${field.label}${star}</label>`;
    const inputStyle = `width:100%;padding:9px 12px;border:1px solid ${form.borderColor};border-radius:${form.borderRadius}px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#fff;color:#111318`;
    let input: string;
    switch (field.type) {
      case 'textarea':
        input = `    <textarea name="${field.id}" placeholder="${field.placeholder}" rows="4" style="${inputStyle};resize:vertical"${req}></textarea>`;
        break;
      case 'select':
        input = `    <select name="${field.id}" style="${inputStyle};appearance:auto"${req}>\n      <option value="">${field.placeholder || 'Select...'}</option>\n${(field.options || []).map(o => `      <option value="${o}">${o}</option>`).join('\n')}\n    </select>`;
        break;
      default:
        input = `    <input name="${field.id}" type="${field.type === 'email' ? 'email' : 'text'}" placeholder="${field.placeholder}" style="${inputStyle}"${req} />`;
        break;
    }
    return `  <div style="margin-bottom:16px">\n${label}\n${input}\n  </div>`;
  });

  return `<div style="max-width:480px;margin:0 auto;font-family:${font}">
<form action="${url}" method="POST" style="padding:24px;border:1px solid ${form.borderColor};border-radius:${form.borderRadius}px;background:#fff">
  <h3 style="margin:0 0 16px 0;font-size:18px;font-weight:600;color:#111318">${form.name}</h3>
${fieldHtml.join('\n')}
  <button type="submit" style="width:100%;padding:10px 18px;background:${form.accentColor};color:#fff;border:none;border-radius:${form.borderRadius}px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">${form.buttonLabel || 'Submit'}</button>
</form>
</div>`;
}

/**
 * Iframe embed: a single `<iframe>` pointed at the hosted public form URL.
 * Because the form is rendered on our origin, the user's custom CSS is
 * applied. Recommended for designers who want pixel-perfect styling.
 */
function generateIframeEmbedCode(form: CrmLeadForm): string {
  const serverUrl = getServerUrl();
  const url = `${serverUrl}/api/v1/crm/forms/public/${form.token}`;
  return `<iframe
  src="${url}"
  title="${form.name.replace(/"/g, '&quot;')}"
  loading="lazy"
  style="width:100%;max-width:480px;min-height:520px;border:0;display:block;margin:0 auto"
></iframe>`;
}

function getFieldTypeIcon(type: LeadFormFieldType) {
  switch (type) {
    case 'email': return <Mail size={14} />;
    case 'phone': return <Phone size={14} />;
    case 'textarea': return <AlignLeft size={14} />;
    case 'select': return <ListFilter size={14} />;
    default: return <Type size={14} />;
  }
}

// ─── Field Editor Panel ─────────────────────────────────────────────

function FieldEditorPanel({
  field, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast,
}: {
  field: LeadFormField;
  onChange: (updated: LeadFormField) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div style={{
      border: '1px solid var(--color-border-primary)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--color-bg-primary)',
      padding: 'var(--spacing-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-sm)',
    }}>
      {/* Header with type icon, label, and actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <span style={{ color: 'var(--color-text-tertiary)', display: 'flex', flexShrink: 0 }}>
          {getFieldTypeIcon(field.type)}
        </span>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          size="sm"
          style={{ flex: 1, fontWeight: 500 }}
          placeholder="Field label"
        />
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <IconButton icon={<ChevronUp size={12} />} label="Move up" size={22} onClick={onMoveUp} style={{ opacity: isFirst ? 0.3 : 1 }} />
          <IconButton icon={<ChevronDown size={12} />} label="Move down" size={22} onClick={onMoveDown} style={{ opacity: isLast ? 0.3 : 1 }} />
          <IconButton icon={<Trash2 size={12} />} label="Delete field" size={22} destructive onClick={onDelete} />
        </div>
      </div>

      {/* Settings row */}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Type</label>
          <Select
            value={field.type}
            onChange={(v) => onChange({ ...field, type: v as LeadFormFieldType })}
            options={FIELD_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            size="sm"
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Placeholder</label>
          <Input
            value={field.placeholder}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            size="sm"
            placeholder="Placeholder text"
          />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Maps to</label>
          <Select
            value={field.mapTo || ''}
            onChange={(v) => onChange({ ...field, mapTo: v || undefined })}
            options={MAP_TO_OPTIONS}
            size="sm"
          />
        </div>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family)', whiteSpace: 'nowrap', cursor: 'pointer',
          paddingBottom: 4,
        }}>
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
          />
          Required
        </label>
      </div>

      {/* Options for select type */}
      {field.type === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Options (one per line)</label>
          <Textarea
            value={(field.options || []).join('\n')}
            onChange={(e) => onChange({ ...field, options: e.target.value.split('\n').filter(Boolean) })}
            rows={3}
            placeholder="Option 1\nOption 2\nOption 3"
          />
        </div>
      )}
    </div>
  );
}

// ─── Presets ─────────────────────────────────────────────────────────

interface BrandingPreset {
  id: string;
  name: string;
  accentColor: string;
  borderColor: string;
  borderRadius: number;
  fontFamily: string;
}

const BRANDING_PRESETS: BrandingPreset[] = [
  { id: 'classic', name: 'Classic green', accentColor: '#13715B', borderColor: '#d0d5dd', borderRadius: 6, fontFamily: 'inherit' },
  { id: 'minimal', name: 'Minimal grey', accentColor: '#111318', borderColor: '#e4e7ec', borderRadius: 4, fontFamily: 'inherit' },
  { id: 'bold', name: 'Bold blue', accentColor: '#2563eb', borderColor: '#cbd5e1', borderRadius: 10, fontFamily: 'inherit' },
];

const FONT_OPTIONS = [
  { value: 'inherit', label: 'Match host site' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Geist', label: 'Geist' },
  { value: 'system-ui', label: 'System default' },
  { value: 'Georgia', label: 'Georgia (serif)' },
];

// ─── Branding Panel ─────────────────────────────────────────────────

function BrandingPanel({
  accentColor, borderColor, borderRadius, fontFamily, customCss, cssError,
  onAccent, onBorder, onRadius, onFont, onCustomCss, onPreset,
}: {
  accentColor: string;
  borderColor: string;
  borderRadius: number;
  fontFamily: string;
  customCss: string;
  cssError: string | null;
  onAccent: (v: string) => void;
  onBorder: (v: string) => void;
  onRadius: (v: number) => void;
  onFont: (v: string) => void;
  onCustomCss: (v: string) => void;
  onPreset: (p: BrandingPreset) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Preset row */}
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 8, fontFamily: 'var(--font-family)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Presets
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          {BRANDING_PRESETS.map((p) => {
            const isActive = accentColor === p.accentColor && borderColor === p.borderColor && borderRadius === p.borderRadius;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPreset(p)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  border: `1px solid ${isActive ? p.accentColor : 'var(--color-border-secondary)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'var(--font-family)',
                  color: 'var(--color-text-primary)',
                  boxShadow: isActive ? `inset 0 0 0 1px ${p.accentColor}55` : 'none',
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.accentColor, flexShrink: 0 }} />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tokens */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 'var(--spacing-lg)',
      }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Accent colour</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input type="color" value={accentColor} onChange={(e) => onAccent(e.target.value)} style={{ width: 34, height: 28, border: '1px solid var(--color-border-secondary)', borderRadius: 4, padding: 0, background: 'none', cursor: 'pointer' }} />
            <Input size="sm" value={accentColor} onChange={(e) => onAccent(e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Border colour</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input type="color" value={borderColor} onChange={(e) => onBorder(e.target.value)} style={{ width: 34, height: 28, border: '1px solid var(--color-border-secondary)', borderRadius: 4, padding: 0, background: 'none', cursor: 'pointer' }} />
            <Input size="sm" value={borderColor} onChange={(e) => onBorder(e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Corner radius</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <input
              type="range"
              min={0}
              max={20}
              value={borderRadius}
              onChange={(e) => onRadius(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: 32, textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-secondary)' }}>{borderRadius}px</span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>Font</label>
          <div style={{ marginTop: 4 }}>
            <Select
              value={fontFamily}
              onChange={onFont}
              options={FONT_OPTIONS}
              size="sm"
              width="100%"
            />
          </div>
        </div>
      </div>

      {/* Advanced CSS */}
      <div style={{ borderTop: '1px solid var(--color-border-secondary)', paddingTop: 'var(--spacing-md)' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, color: 'var(--color-text-secondary)', padding: 0,
            fontFamily: 'var(--font-family)',
          }}
        >
          {showAdvanced ? <ChevronDown size={14} /> : <ChevronUp size={14} style={{ transform: 'rotate(180deg)' }} />}
          Advanced CSS (hosted page only)
        </button>
        {showAdvanced && (
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 0, marginBottom: 8, fontFamily: 'var(--font-family)', lineHeight: 1.5 }}>
              Applied only when the form is rendered via the iframe embed or the hosted URL.{' '}
              Scope your selectors under <code>.atlas-lead-form</code>. <code>@import</code>, <code>javascript:</code>, and other script vectors are rejected.
            </p>
            <Textarea
              value={customCss}
              onChange={(e) => onCustomCss(e.target.value)}
              rows={12}
              placeholder={`.atlas-lead-form {\n  background: #fafafa;\n}\n.atlas-lead-form__button {\n  letter-spacing: 0.02em;\n}`}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5 }}
            />
            {cssError && (
              <div style={{
                marginTop: 8,
                padding: '8px 10px',
                background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: 12,
                fontFamily: 'var(--font-family)',
              }}>
                {cssError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Form Editor ────────────────────────────────────────────────────

type EditorTab = 'fields' | 'branding';

function FormEditor({
  form, onBack,
}: {
  form: CrmLeadForm;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const updateForm = useUpdateLeadForm();
  const [fields, setFields] = useState<LeadFormField[]>(form.fields);
  const [formName, setFormName] = useState(form.name);
  const [buttonLabel, setButtonLabel] = useState(form.buttonLabel);
  const [thankYouMessage, setThankYouMessage] = useState(form.thankYouMessage);
  const [accentColor, setAccentColor] = useState(form.accentColor);
  const [borderColor, setBorderColor] = useState(form.borderColor);
  const [borderRadius, setBorderRadius] = useState(form.borderRadius);
  const [fontFamily, setFontFamily] = useState(form.fontFamily);
  const [customCss, setCustomCss] = useState<string>(form.customCss ?? '');
  const [cssError, setCssError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('fields');
  const [embedMode, setEmbedMode] = useState<'iframe' | 'inline'>('iframe');

  // Wrap each branding setter so any branding edit flips hasChanges.
  const markDirty = useCallback(() => setHasChanges(true), []);
  const setBrand = {
    buttonLabel: (v: string) => { setButtonLabel(v); markDirty(); },
    thankYouMessage: (v: string) => { setThankYouMessage(v); markDirty(); },
    accentColor: (v: string) => { setAccentColor(v); markDirty(); },
    borderColor: (v: string) => { setBorderColor(v); markDirty(); },
    borderRadius: (v: number) => { setBorderRadius(v); markDirty(); },
    fontFamily: (v: string) => { setFontFamily(v); markDirty(); },
    customCss: (v: string) => { setCustomCss(v); markDirty(); },
    applyPreset: (p: BrandingPreset) => {
      setAccentColor(p.accentColor);
      setBorderColor(p.borderColor);
      setBorderRadius(p.borderRadius);
      setFontFamily(p.fontFamily);
      markDirty();
    },
  };

  const updateField = useCallback((index: number, updated: LeadFormField) => {
    setFields(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
    setHasChanges(true);
  }, []);

  const addField = useCallback((type: LeadFormFieldType) => {
    const id = generateId();
    const typeConfig = FIELD_TYPE_OPTIONS.find(o => o.value === type);
    setFields(prev => [...prev, {
      id,
      type,
      label: typeConfig?.label || 'New field',
      placeholder: '',
      required: false,
    }]);
    setHasChanges(true);
  }, []);

  const deleteField = useCallback((index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }, []);

  const moveField = useCallback((index: number, direction: -1 | 1) => {
    setFields(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    updateForm.mutate({
      id: form.id,
      name: formName,
      fields,
      buttonLabel,
      thankYouMessage,
      accentColor,
      borderColor,
      borderRadius,
      fontFamily,
      customCss: customCss.trim().length > 0 ? customCss : null,
    }, {
      onSuccess: () => {
        setHasChanges(false);
        setCssError(null);
        addToast({ message: t('crm.leadForms.formSaved'), type: 'success' });
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? t('crm.leadForms.formSaveFailed', 'Save failed');
        if (/css|color|radius/i.test(msg)) {
          setCssError(msg);
          setActiveTab('branding');
        }
        addToast({ message: msg, type: 'error' });
      },
    });
  }, [
    form.id, formName, fields,
    buttonLabel, thankYouMessage,
    accentColor, borderColor, borderRadius, fontFamily, customCss,
    updateForm, addToast, t,
  ]);

  // Merge the editor's current draft onto the persisted form shape so the
  // live preview, embed snippets, and save payload all see the same values.
  const draftForm: CrmLeadForm = useMemo(() => ({
    ...form,
    name: formName,
    fields,
    buttonLabel,
    thankYouMessage,
    accentColor,
    borderColor,
    borderRadius,
    fontFamily,
    customCss: customCss.trim().length > 0 ? customCss : null,
  }), [form, formName, fields, buttonLabel, thankYouMessage, accentColor, borderColor, borderRadius, fontFamily, customCss]);

  const handleCopyEmbed = useCallback(async () => {
    const code = embedMode === 'iframe'
      ? generateIframeEmbedCode(draftForm)
      : generateEmbedCode(draftForm);
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    addToast({ message: t('crm.leadForms.codeCopied'), type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  }, [draftForm, embedMode, addToast, t]);

  // Live preview — an iframe whose srcDoc is the HTML returned by the
  // /crm/forms/preview endpoint. Debounced so we don't hammer the server
  // on every keystroke.
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const previewAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setTimeout(async () => {
      previewAbortRef.current?.abort();
      const ctrl = new AbortController();
      previewAbortRef.current = ctrl;
      try {
        const { data } = await api.post('/crm/forms/preview', {
          name: draftForm.name,
          fields: draftForm.fields,
          buttonLabel: draftForm.buttonLabel,
          thankYouMessage: draftForm.thankYouMessage,
          accentColor: draftForm.accentColor,
          borderColor: draftForm.borderColor,
          borderRadius: draftForm.borderRadius,
          fontFamily: draftForm.fontFamily,
          customCss: draftForm.customCss,
        }, { signal: ctrl.signal, transformResponse: (r) => r });
        setPreviewSrcDoc(typeof data === 'string' ? data : '');
        setCssError(null);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        // Parse server validation message from the 400 body.
        let msg: string | null = null;
        try {
          const body = typeof err?.response?.data === 'string'
            ? JSON.parse(err.response.data)
            : err?.response?.data;
          msg = body?.error ?? null;
        } catch { /* ignore */ }
        setCssError(msg ?? 'Preview failed');
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      previewAbortRef.current?.abort();
    };
  }, [draftForm]);

  // Keep `previewForm` as an alias so existing consumers below keep working.
  const previewForm = draftForm;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
        padding: 'var(--spacing-md) var(--spacing-xl)',
        borderBottom: '1px solid var(--color-border-secondary)',
        flexShrink: 0,
      }}>
        <IconButton icon={<ArrowLeft size={16} />} label="Back" size={28} onClick={onBack} />
        <Input
          value={formName}
          onChange={(e) => { setFormName(e.target.value); setHasChanges(true); }}
          size="sm"
          style={{ flex: 1, maxWidth: 300, fontWeight: 600 }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', fontFamily: 'var(--font-family)' }}>
              Unsaved changes
            </span>
          )}
          <Button variant="ghost" size="sm" icon={<Eye size={13} />} onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Editor' : 'Preview'}
          </Button>
          <Button variant="ghost" size="sm" icon={<Copy size={13} />} onClick={() => setShowEmbedModal(true)}>
            Embed
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!hasChanges}>
            {t('crm.actions.save')}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
        {showPreview ? (
          /* Live hosted-page preview — server-rendered so it honours custom CSS */
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {cssError && (
              <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                marginBottom: 'var(--spacing-md)',
                background: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-error) 25%, transparent)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-family)',
              }}>
                {cssError}
              </div>
            )}
            <iframe
              title="Form preview"
              srcDoc={previewSrcDoc}
              style={{
                width: '100%',
                height: 600,
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
              }}
            />
          </div>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Tab strip */}
            <div style={{
              display: 'inline-flex',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: 2,
              marginBottom: 'var(--spacing-lg)',
              background: 'var(--color-bg-tertiary)',
              fontFamily: 'var(--font-family)',
            }}>
              {([
                { id: 'fields' as const, label: t('crm.leadForms.tabFields', 'Fields'), icon: <Type size={13} /> },
                { id: 'branding' as const, label: t('crm.leadForms.tabBranding', 'Branding'), icon: <Palette size={13} /> },
              ]).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: isActive ? 'var(--color-bg-primary)' : 'transparent',
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      fontSize: 13,
                      fontWeight: isActive ? 500 : 400,
                      cursor: 'pointer',
                      boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === 'fields' ? (
              <>
                {/* Per-form copy controls, above the field list */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)',
                }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                      Button label
                    </label>
                    <Input size="sm" value={buttonLabel} onChange={(e) => setBrand.buttonLabel(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
                      Thank-you message
                    </label>
                    <Input size="sm" value={thankYouMessage} onChange={(e) => setBrand.thankYouMessage(e.target.value)} />
                  </div>
                </div>

                {/* Field list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                  {fields.length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: 'var(--spacing-2xl)',
                      color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)',
                      border: '2px dashed var(--color-border-secondary)',
                      borderRadius: 'var(--radius-lg)',
                    }}>
                      <Type size={32} style={{ marginBottom: 'var(--spacing-sm)', opacity: 0.3 }} />
                      <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>
                        No fields yet. Add a field below to get started.
                      </p>
                    </div>
                  )}
                  {fields.map((field, i) => (
                    <FieldEditorPanel
                      key={field.id}
                      field={field}
                      onChange={(updated) => updateField(i, updated)}
                      onDelete={() => deleteField(i)}
                      onMoveUp={() => moveField(i, -1)}
                      onMoveDown={() => moveField(i, 1)}
                      isFirst={i === 0}
                      isLast={i === fields.length - 1}
                    />
                  ))}
                </div>

                {/* Add field buttons */}
                <div style={{
                  display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap',
                  padding: 'var(--spacing-md)',
                  border: '1px dashed var(--color-border-secondary)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', width: '100%', marginBottom: 2 }}>
                    Add field
                  </span>
                  {FIELD_TYPE_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <Button key={opt.value} variant="secondary" size="sm" icon={<Icon size={13} />} onClick={() => addField(opt.value)}>
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </>
            ) : (
              <BrandingPanel
                accentColor={accentColor}
                borderColor={borderColor}
                borderRadius={borderRadius}
                fontFamily={fontFamily}
                customCss={customCss}
                cssError={cssError}
                onAccent={setBrand.accentColor}
                onBorder={setBrand.borderColor}
                onRadius={setBrand.borderRadius}
                onFont={setBrand.fontFamily}
                onCustomCss={setBrand.customCss}
                onPreset={setBrand.applyPreset}
              />
            )}
          </div>
        )}
      </div>

      {/* Embed code modal — two variants: iframe (hosted, supports custom CSS)
          and inline (self-contained <form>, tokens only, no custom CSS). */}
      <Modal open={showEmbedModal} onOpenChange={setShowEmbedModal} width={620} title={t('crm.leadForms.embedCode')}>
        <Modal.Header title={t('crm.leadForms.embedCode')} />
        <Modal.Body>
          <div style={{
            display: 'inline-flex',
            border: '1px solid var(--color-border-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: 2,
            marginBottom: 'var(--spacing-md)',
            background: 'var(--color-bg-tertiary)',
            fontFamily: 'var(--font-family)',
          }}>
            {([
              { id: 'iframe' as const, label: 'Iframe (recommended)' },
              { id: 'inline' as const, label: 'Inline' },
            ]).map((t) => {
              const isActive = embedMode === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEmbedMode(t.id)}
                  style={{
                    padding: '6px 14px',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--color-bg-primary)' : 'transparent',
                    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <p style={{
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-family)', marginBottom: 'var(--spacing-md)', marginTop: 0,
          }}>
            {embedMode === 'iframe'
              ? 'Paste this snippet anywhere on your site. The form is hosted on Atlas, so your custom CSS (from the Branding tab) is applied exactly as previewed.'
              : "Paste this self-contained form anywhere on your site. It inherits your site's font and uses the branding tokens you chose — but custom CSS from the Branding tab is NOT applied here (it would bleed into your page styles)."}
          </p>
          <pre style={{
            background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)',
            fontFamily: 'monospace', overflow: 'auto', maxHeight: 300,
            color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {embedMode === 'iframe'
              ? generateIframeEmbedCode(previewForm)
              : generateEmbedCode(previewForm)}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowEmbedModal(false)}>{t('common.close')}</Button>
          <Button
            variant="primary"
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={handleCopyEmbed}
          >
            {copied ? t('crm.leadForms.copied') : t('crm.leadForms.copyCode')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ─── LeadFormsView component ────────────────────────────────────────

export function LeadFormsView() {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { data: formsData, isLoading } = useLeadForms();
  const createForm = useCreateLeadForm();
  const updateForm = useUpdateLeadForm();
  const deleteForm = useDeleteLeadForm();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const forms = formsData?.forms ?? [];
  const editingForm = editingFormId ? forms.find(f => f.id === editingFormId) : null;

  const handleCreate = useCallback(() => {
    if (!formName.trim()) return;
    createForm.mutate({ name: formName.trim() }, {
      onSuccess: (form) => {
        setFormName('');
        setShowCreateModal(false);
        setEditingFormId(form.id);
      },
    });
  }, [formName, createForm]);

  const handleToggleActive = useCallback((form: CrmLeadForm) => {
    updateForm.mutate({ id: form.id, isActive: !form.isActive });
  }, [updateForm]);

  const handleDelete = useCallback((id: string) => {
    deleteForm.mutate(id);
    setDeleteConfirm(null);
  }, [deleteForm]);

  const handleCopyEmbed = useCallback(async (form: CrmLeadForm) => {
    const code = generateEmbedCode(form);
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    addToast({ message: t('crm.leadForms.codeCopied'), type: 'success' });
  }, [addToast, t]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
        {t('common.loading')}...
      </div>
    );
  }

  // If editing a form, show the editor
  if (editingForm) {
    return <FormEditor form={editingForm} onBack={() => setEditingFormId(null)} />;
  }

  return (
    <div style={{ padding: 'var(--spacing-xl)', overflow: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h2 style={{
            fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)',
            margin: 0,
          }}>
            {t('crm.leadForms.title')}
          </h2>
          <p style={{
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)', margin: '4px 0 0 0',
          }}>
            {t('crm.leadForms.subtitle')}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreateModal(true)}>
          {t('crm.leadForms.createForm')}
        </Button>
      </div>

      {/* Forms list */}
      {forms.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--spacing-2xl)',
          color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)',
        }}>
          <Globe size={40} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.4 }} />
          <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' }}>
            {t('crm.leadForms.noForms')}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>
            {t('crm.leadForms.noFormsDesc')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {forms.map((form) => (
            <div
              key={form.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-primary)',
                fontFamily: 'var(--font-family)', cursor: 'pointer',
                transition: 'border-color 0.1s',
              }}
              onClick={() => setEditingFormId(form.id)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-primary)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-secondary)'; }}
            >
              <FileText size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />

              {/* Name & info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {form.name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {form.fields.length} {form.fields.length === 1 ? 'field' : 'fields'} &middot; {t('crm.leadForms.submissions', { count: form.submitCount })}
                </div>
              </div>

              {/* Status badge */}
              <Badge variant={form.isActive ? 'success' : 'default'}>
                {form.isActive ? t('crm.leadForms.active') : t('crm.leadForms.inactive')}
              </Badge>

              {/* Toggle active */}
              <IconButton
                icon={form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                label={form.isActive ? t('crm.leadForms.deactivate') : t('crm.leadForms.activate')}
                size={28}
                onClick={(e) => { e.stopPropagation(); handleToggleActive(form); }}
                style={{ color: form.isActive ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}
              />

              {/* Copy embed code */}
              <Button variant="ghost" size="sm" icon={<Copy size={13} />} onClick={(e) => { e.stopPropagation(); handleCopyEmbed(form); }}>
                {t('crm.leadForms.embedCode')}
              </Button>

              {/* Delete */}
              <IconButton
                icon={<Trash2 size={14} />}
                label={t('common.delete')}
                size={28}
                destructive
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(form.id); }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create form modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal} width={400} title={t('crm.leadForms.createForm')}>
        <Modal.Header title={t('crm.leadForms.createForm')} />
        <Modal.Body>
          <Input
            label={t('crm.leadForms.formName')}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder={t('crm.leadForms.formNamePlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => { setShowCreateModal(false); setFormName(''); }}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!formName.trim()}>{t('crm.leadForms.create')}</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title={t('crm.leadForms.deleteForm')}
        description={t('crm.leadForms.deleteFormDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  );
}
