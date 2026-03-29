import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Briefcase, Users, Building2, Clock, Plus, Search, Settings2, X,
  ChevronRight, Trash2, Phone as PhoneIcon, Mail, DollarSign,
  Trophy, XCircle, LayoutGrid, List,
  MessageSquare, PhoneCall, CalendarDays, StickyNote,
} from 'lucide-react';
import {
  useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany,
  useContacts, useCreateContact, useUpdateContact, useDeleteContact,
  useStages, useCreateStage,
  useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal,
  useMarkDealWon, useMarkDealLost,
  useActivities, useCreateActivity, useDeleteActivity,
  useSeedCrmData,
  type CrmCompany, type CrmContact, type CrmDealStage, type CrmDeal, type CrmActivity,
} from './hooks';
import { DealKanban } from './components/deal-kanban';
import { AppSidebar, SidebarSection, SidebarItem } from '../../components/layout/app-sidebar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Modal } from '../../components/ui/modal';
import { Textarea } from '../../components/ui/textarea';
import { IconButton } from '../../components/ui/icon-button';
import { Badge } from '../../components/ui/badge';
import { SmartButtonBar } from '../../components/shared/SmartButtonBar';
import { useUIStore } from '../../stores/ui-store';
import '../../styles/crm.css';

// ─── Types ─────────────────────────────────────────────────────────

type ActiveView = 'pipeline' | 'deals' | 'contacts' | 'companies' | 'activities';

// ─── Helpers ───────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'call': return <PhoneCall size={14} />;
    case 'email': return <Mail size={14} />;
    case 'meeting': return <CalendarDays size={14} />;
    default: return <StickyNote size={14} />;
  }
}

function getActivityLabel(type: string): string {
  switch (type) {
    case 'call': return 'Call';
    case 'email': return 'Email';
    case 'meeting': return 'Meeting';
    default: return 'Note';
  }
}

// ─── Create Deal Modal ─────────────────────────────────────────────

function CreateDealModal({
  open, onClose, stages, contacts, companies,
}: {
  open: boolean;
  onClose: () => void;
  stages: CrmDealStage[];
  contacts: CrmContact[];
  companies: CrmCompany[];
}) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stageId, setStageId] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const createDeal = useCreateDeal();

  const defaultStage = stages.find((s) => s.isDefault) ?? stages[0];

  useEffect(() => {
    if (open && defaultStage && !stageId) {
      setStageId(defaultStage.id);
    }
  }, [open, defaultStage, stageId]);

  const reset = () => { setTitle(''); setValue(''); setStageId(''); setContactId(''); setCompanyId(''); setCloseDate(''); };

  const handleSubmit = () => {
    if (!title.trim() || !stageId) return;
    createDeal.mutate({
      title: title.trim(),
      value: Number(value) || 0,
      stageId,
      contactId: contactId || null,
      companyId: companyId || null,
      expectedCloseDate: closeDate || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={480} title="New deal">
      <Modal.Header title="New deal" subtitle="Create a new deal in the pipeline" />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label="Deal title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enterprise license" autoFocus />
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label="Value ($)" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" style={{ flex: 1 }} />
            <Input label="Expected close" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Stage</label>
            <Select
              value={stageId}
              onChange={setStageId}
              options={stages.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Select stage..."
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Contact</label>
              <Select
                value={contactId}
                onChange={setContactId}
                options={[{ value: '', label: 'None' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]}
                placeholder="Select contact..."
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Company</label>
              <Select
                value={companyId}
                onChange={setCompanyId}
                options={[{ value: '', label: 'None' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
                placeholder="Select company..."
              />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!title.trim() || !stageId}>Create deal</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Create Contact Modal ──────────────────────────────────────────

function CreateContactModal({
  open, onClose, companies,
}: {
  open: boolean;
  onClose: () => void;
  companies: CrmCompany[];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [position, setPosition] = useState('');
  const createContact = useCreateContact();

  const reset = () => { setName(''); setEmail(''); setPhone(''); setCompanyId(''); setPosition(''); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createContact.mutate({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      companyId: companyId || null,
      position: position.trim() || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={440} title="New contact">
      <Modal.Header title="New contact" subtitle="Add a new contact" />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" autoFocus />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Company</label>
            <Select
              value={companyId}
              onChange={setCompanyId}
              options={[{ value: '', label: 'None' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
              placeholder="Select company..."
            />
          </div>
          <Input label="Position" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="CTO" />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>Add contact</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Create Company Modal ──────────────────────────────────────────

function CreateCompanyModal({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const createCompany = useCreateCompany();

  const reset = () => { setName(''); setDomain(''); setIndustry(''); setSize(''); setAddress(''); setPhone(''); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    createCompany.mutate({
      name: name.trim(),
      domain: domain.trim() || null,
      industry: industry.trim() || null,
      size: size || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={440} title="New company">
      <Modal.Header title="New company" subtitle="Add a new company" />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label="Company name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" autoFocus />
          <Input label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Input label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Technology" style={{ flex: 1 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Size</label>
              <Select
                value={size}
                onChange={setSize}
                options={[
                  { value: '', label: 'Select...' },
                  { value: '1-10', label: '1-10' },
                  { value: '11-50', label: '11-50' },
                  { value: '51-200', label: '51-200' },
                  { value: '201-500', label: '201-500' },
                  { value: '501-1000', label: '501-1000' },
                  { value: '1000+', label: '1000+' },
                ]}
              />
            </div>
          </div>
          <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!name.trim()}>Add company</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Log Activity Modal ────────────────────────────────────────────

function LogActivityModal({
  open, onClose, defaultDealId, defaultContactId, defaultCompanyId,
  deals, contacts, companies,
}: {
  open: boolean;
  onClose: () => void;
  defaultDealId?: string | null;
  defaultContactId?: string | null;
  defaultCompanyId?: string | null;
  deals: CrmDeal[];
  contacts: CrmContact[];
  companies: CrmCompany[];
}) {
  const [type, setType] = useState('note');
  const [body, setBody] = useState('');
  const [dealId, setDealId] = useState(defaultDealId || '');
  const [contactId, setContactId] = useState(defaultContactId || '');
  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const createActivity = useCreateActivity();

  useEffect(() => {
    setDealId(defaultDealId || '');
    setContactId(defaultContactId || '');
    setCompanyId(defaultCompanyId || '');
  }, [defaultDealId, defaultContactId, defaultCompanyId]);

  const reset = () => { setType('note'); setBody(''); setDealId(''); setContactId(''); setCompanyId(''); };

  const handleSubmit = () => {
    if (!body.trim()) return;
    createActivity.mutate({
      type,
      body: body.trim(),
      dealId: dealId || null,
      contactId: contactId || null,
      companyId: companyId || null,
    }, {
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={480} title="Log activity">
      <Modal.Header title="Log activity" subtitle="Record a call, meeting, email, or note" />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Type</label>
            <Select
              value={type}
              onChange={setType}
              options={[
                { value: 'note', label: 'Note' },
                { value: 'call', label: 'Call' },
                { value: 'email', label: 'Email' },
                { value: 'meeting', label: 'Meeting' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Details</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What happened?" rows={3} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Deal</label>
              <Select value={dealId} onChange={setDealId} options={[{ value: '', label: 'None' }, ...deals.map((d) => ({ value: d.id, label: d.title }))]} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>Contact</label>
              <Select value={contactId} onChange={setContactId} options={[{ value: '', label: 'None' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!body.trim()}>Log activity</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Mark Lost Modal ───────────────────────────────────────────────

function MarkLostModal({
  open, onClose, dealId,
}: {
  open: boolean;
  onClose: () => void;
  dealId: string;
}) {
  const [reason, setReason] = useState('');
  const markLost = useMarkDealLost();

  const handleSubmit = () => {
    markLost.mutate({ id: dealId, reason: reason.trim() || undefined }, {
      onSuccess: () => { setReason(''); onClose(); },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} width={400} title="Mark as lost">
      <Modal.Header title="Mark deal as lost" subtitle="Record why this deal was lost" />
      <Modal.Body>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for losing the deal..." rows={3} autoFocus />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleSubmit}>Mark as lost</Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Activity Timeline ─────────────────────────────────────────────

function ActivityTimeline({ activities }: { activities: CrmActivity[] }) {
  if (activities.length === 0) {
    return (
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', padding: 'var(--spacing-sm) 0' }}>
        No activities yet
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {activities.slice(0, 10).map((activity) => (
        <div key={activity.id} className="crm-activity-item">
          <div className="crm-activity-icon">
            {getActivityIcon(activity.type)}
          </div>
          <div className="crm-activity-body">
            <div className="crm-activity-text">{activity.body}</div>
            <div className="crm-activity-meta">
              {getActivityLabel(activity.type)} &middot; {formatDate(activity.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Deal Detail Panel ─────────────────────────────────────────────

function DealDetailPanel({
  deal, stages, onClose, onMarkWon, onMarkLost,
}: {
  deal: CrmDeal;
  stages: CrmDealStage[];
  onClose: () => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
}) {
  const [stageId, setStageId] = useState(deal.stageId);
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();
  const { data: activitiesData } = useActivities({ dealId: deal.id });
  const activities = activitiesData?.activities ?? [];

  useEffect(() => {
    setStageId(deal.stageId);
  }, [deal.id, deal.stageId]);

  return (
    <div className="crm-detail-panel">
      <div style={{
        padding: '12px var(--spacing-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-family)' }}>
          Deal detail
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon={<Trash2 size={14} />} label="Delete deal" size={28} destructive onClick={() => { deleteDeal.mutate(deal.id); onClose(); }} />
          <IconButton icon={<X size={14} />} label="Close" size={28} onClick={onClose} />
        </div>
      </div>

      <SmartButtonBar appId="crm" recordId={deal.id} />

      <div className="crm-detail-body">
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
          {deal.title}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <div className="crm-detail-field">
            <span className="crm-detail-field-label">Value</span>
            <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
              {formatCurrency(deal.value)}
            </div>
          </div>

          <div className="crm-detail-field">
            <span className="crm-detail-field-label">Stage</span>
            <Select
              value={stageId}
              onChange={(v) => {
                setStageId(v);
                updateDeal.mutate({ id: deal.id, stageId: v });
              }}
              options={stages.map((s) => ({
                value: s.id,
                label: s.name,
                icon: <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />,
              }))}
              size="sm"
            />
          </div>

          {deal.companyName && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Company</span>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Building2 size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {deal.companyName}
              </div>
            </div>
          )}

          {deal.contactName && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Contact</span>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Users size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {deal.contactName}
              </div>
            </div>
          )}

          <div className="crm-detail-field">
            <span className="crm-detail-field-label">Probability</span>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
              {deal.probability}%
            </div>
          </div>

          {deal.expectedCloseDate && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Expected close</span>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                {formatDate(deal.expectedCloseDate)}
              </div>
            </div>
          )}

          {deal.wonAt && (
            <Badge variant="success">Won on {formatDate(deal.wonAt)}</Badge>
          )}
          {deal.lostAt && (
            <div>
              <Badge variant="error">Lost on {formatDate(deal.lostAt)}</Badge>
              {deal.lostReason && (
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginTop: 'var(--spacing-xs)' }}>
                  {deal.lostReason}
                </div>
              )}
            </div>
          )}

          {!deal.wonAt && !deal.lostAt && (
            <div className="crm-deal-action-buttons">
              <Button variant="primary" size="sm" icon={<Trophy size={14} />} onClick={onMarkWon}>
                Won
              </Button>
              <Button variant="danger" size="sm" icon={<XCircle size={14} />} onClick={onMarkLost}>
                Lost
              </Button>
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div style={{ marginTop: 'var(--spacing-sm)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)' }}>
            Activity
          </div>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}

// ─── Contact Detail Panel ──────────────────────────────────────────

function ContactDetailPanel({
  contact, deals, onClose,
}: {
  contact: CrmContact;
  deals: CrmDeal[];
  onClose: () => void;
}) {
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const { data: activitiesData } = useActivities({ contactId: contact.id });
  const activities = activitiesData?.activities ?? [];
  const contactDeals = deals.filter((d) => d.contactId === contact.id);

  return (
    <div className="crm-detail-panel">
      <div style={{
        padding: '12px var(--spacing-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-family)' }}>
          Contact detail
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon={<Trash2 size={14} />} label="Delete contact" size={28} destructive onClick={() => { deleteContact.mutate(contact.id); onClose(); }} />
          <IconButton icon={<X size={14} />} label="Close" size={28} onClick={onClose} />
        </div>
      </div>

      <SmartButtonBar appId="crm" recordId={contact.id} />

      <div className="crm-detail-body">
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
          {contact.name}
        </div>
        {contact.position && (
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginTop: -8 }}>
            {contact.position}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {contact.email && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Email</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <Mail size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {contact.email}
              </div>
            </div>
          )}

          {contact.phone && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Phone</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <PhoneIcon size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {contact.phone}
              </div>
            </div>
          )}

          {contact.companyName && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Company</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <Building2 size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {contact.companyName}
              </div>
            </div>
          )}

          {contact.source && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Source</span>
              <Badge variant="default">{contact.source}</Badge>
            </div>
          )}
        </div>

        {/* Linked deals */}
        {contactDeals.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)' }}>
              Deals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {contactDeals.map((deal) => (
                <div key={deal.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px var(--spacing-sm)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)',
                  fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)',
                }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{deal.title}</span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(deal.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity */}
        <div style={{ marginTop: 'var(--spacing-sm)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)' }}>
            Activity
          </div>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}

// ─── Company Detail Panel ──────────────────────────────────────────

function CompanyDetailPanel({
  company, contacts, deals, onClose,
}: {
  company: CrmCompany;
  contacts: CrmContact[];
  deals: CrmDeal[];
  onClose: () => void;
}) {
  const deleteCompany = useDeleteCompany();
  const { data: activitiesData } = useActivities({ companyId: company.id });
  const activities = activitiesData?.activities ?? [];
  const companyContacts = contacts.filter((c) => c.companyId === company.id);
  const companyDeals = deals.filter((d) => d.companyId === company.id);

  return (
    <div className="crm-detail-panel">
      <div style={{
        padding: '12px var(--spacing-lg)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0,
      }}>
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-family)' }}>
          Company detail
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconButton icon={<Trash2 size={14} />} label="Delete company" size={28} destructive onClick={() => { deleteCompany.mutate(company.id); onClose(); }} />
          <IconButton icon={<X size={14} />} label="Close" size={28} onClick={onClose} />
        </div>
      </div>

      <SmartButtonBar appId="crm" recordId={company.id} />

      <div className="crm-detail-body">
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
          {company.name}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          {company.domain && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Domain</span>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                {company.domain}
              </div>
            </div>
          )}

          {company.industry && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Industry</span>
              <Badge variant="default">{company.industry}</Badge>
            </div>
          )}

          {company.size && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Size</span>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                {company.size} employees
              </div>
            </div>
          )}

          {company.address && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Address</span>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                {company.address}
              </div>
            </div>
          )}

          {company.phone && (
            <div className="crm-detail-field">
              <span className="crm-detail-field-label">Phone</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)' }}>
                <PhoneIcon size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                {company.phone}
              </div>
            </div>
          )}
        </div>

        {/* Contacts */}
        {companyContacts.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)' }}>
              Contacts ({companyContacts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {companyContacts.map((contact) => (
                <div key={contact.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px var(--spacing-sm)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)',
                  fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)',
                }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{contact.name}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{contact.position || ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals */}
        {companyDeals.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)' }}>
              Deals ({companyDeals.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {companyDeals.map((deal) => (
                <div key={deal.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px var(--spacing-sm)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-secondary)',
                  fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)',
                }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{deal.title}</span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(deal.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity */}
        <div style={{ marginTop: 'var(--spacing-sm)' }}>
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)' }}>
            Activity
          </div>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}

// ─── Deals List View ───────────────────────────────────────────────

function DealsListView({
  deals, selectedId, onSelect, searchQuery,
}: {
  deals: CrmDeal[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return deals;
    const q = searchQuery.toLowerCase();
    return deals.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.companyName?.toLowerCase().includes(q)) ||
      (d.contactName?.toLowerCase().includes(q)),
    );
  }, [deals, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty-state">
        <Briefcase size={48} className="crm-empty-state-icon" />
        <div className="crm-empty-state-title">{searchQuery ? 'No matching deals' : 'No deals yet'}</div>
        <div className="crm-empty-state-desc">{searchQuery ? 'Try a different search term.' : 'Create your first deal to get started.'}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: '8px var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-secondary)', fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)', flexShrink: 0,
      }}>
        <span style={{ width: 200, flexShrink: 0 }}>Title</span>
        <span style={{ width: 140, flexShrink: 0 }}>Company</span>
        <span style={{ width: 120, flexShrink: 0 }}>Contact</span>
        <span style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>Value</span>
        <span style={{ width: 100, flexShrink: 0 }}>Stage</span>
        <span style={{ flex: 1 }}>Close date</span>
      </div>
      {filtered.map((deal) => (
        <div
          key={deal.id}
          className={`crm-row${selectedId === deal.id ? ' selected' : ''}`}
          onClick={() => onSelect(deal.id)}
        >
          <span style={{ width: 200, flexShrink: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deal.title}
          </span>
          <span style={{ width: 140, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deal.companyName || '-'}
          </span>
          <span style={{ width: 120, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deal.contactName || '-'}
          </span>
          <span style={{ width: 100, flexShrink: 0, fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(deal.value)}
          </span>
          <span style={{ width: 100, flexShrink: 0 }}>
            {deal.stageName && (
              <Badge variant="default">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: deal.stageColor || '#6b7280' }} />
                  {deal.stageName}
                </span>
              </Badge>
            )}
          </span>
          <span style={{ flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
            {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '-'}
          </span>
          {selectedId === deal.id && <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Contacts List View ────────────────────────────────────────────

function ContactsListView({
  contacts, selectedId, onSelect, searchQuery,
}: {
  contacts: CrmContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.companyName?.toLowerCase().includes(q)),
    );
  }, [contacts, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty-state">
        <Users size={48} className="crm-empty-state-icon" />
        <div className="crm-empty-state-title">{searchQuery ? 'No matching contacts' : 'No contacts yet'}</div>
        <div className="crm-empty-state-desc">{searchQuery ? 'Try a different search term.' : 'Add your first contact to get started.'}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: '8px var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-secondary)', fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)', flexShrink: 0,
      }}>
        <span style={{ width: 180, flexShrink: 0 }}>Name</span>
        <span style={{ width: 180, flexShrink: 0 }}>Email</span>
        <span style={{ width: 120, flexShrink: 0 }}>Phone</span>
        <span style={{ width: 140, flexShrink: 0 }}>Company</span>
        <span style={{ flex: 1 }}>Position</span>
      </div>
      {filtered.map((contact) => (
        <div
          key={contact.id}
          className={`crm-row${selectedId === contact.id ? ' selected' : ''}`}
          onClick={() => onSelect(contact.id)}
        >
          <span style={{ width: 180, flexShrink: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.name}
          </span>
          <span style={{ width: 180, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.email || '-'}
          </span>
          <span style={{ width: 120, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.phone || '-'}
          </span>
          <span style={{ width: 140, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.companyName || '-'}
          </span>
          <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.position || '-'}
          </span>
          {selectedId === contact.id && <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Companies List View ───────────────────────────────────────────

function CompaniesListView({
  companies, selectedId, onSelect, searchQuery,
}: {
  companies: CrmCompany[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.domain?.toLowerCase().includes(q)) ||
      (c.industry?.toLowerCase().includes(q)),
    );
  }, [companies, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty-state">
        <Building2 size={48} className="crm-empty-state-icon" />
        <div className="crm-empty-state-title">{searchQuery ? 'No matching companies' : 'No companies yet'}</div>
        <div className="crm-empty-state-desc">{searchQuery ? 'Try a different search term.' : 'Add your first company to get started.'}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: '8px var(--spacing-lg)',
        borderBottom: '1px solid var(--color-border-secondary)', fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-family)', flexShrink: 0,
      }}>
        <span style={{ width: 180, flexShrink: 0 }}>Name</span>
        <span style={{ width: 160, flexShrink: 0 }}>Domain</span>
        <span style={{ width: 120, flexShrink: 0 }}>Industry</span>
        <span style={{ width: 80, flexShrink: 0 }}>Size</span>
        <span style={{ flex: 1 }}>Contacts / Deals</span>
      </div>
      {filtered.map((company) => (
        <div
          key={company.id}
          className={`crm-row${selectedId === company.id ? ' selected' : ''}`}
          onClick={() => onSelect(company.id)}
        >
          <span style={{ width: 180, flexShrink: 0, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {company.name}
          </span>
          <span style={{ width: 160, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {company.domain || '-'}
          </span>
          <span style={{ width: 120, flexShrink: 0 }}>
            {company.industry ? <Badge variant="default">{company.industry}</Badge> : <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>-</span>}
          </span>
          <span style={{ width: 80, flexShrink: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
            {company.size || '-'}
          </span>
          <span style={{ flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', fontVariantNumeric: 'tabular-nums' }}>
            {company.contactCount} contacts &middot; {company.dealCount} deals
          </span>
          {selectedId === company.id && <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Activities List View ──────────────────────────────────────────

function ActivitiesListView({
  activities, searchQuery,
}: {
  activities: CrmActivity[];
  searchQuery: string;
}) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase();
    return activities.filter((a) =>
      a.body.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q),
    );
  }, [activities, searchQuery]);

  if (filtered.length === 0) {
    return (
      <div className="crm-empty-state">
        <Clock size={48} className="crm-empty-state-icon" />
        <div className="crm-empty-state-title">{searchQuery ? 'No matching activities' : 'No activities yet'}</div>
        <div className="crm-empty-state-desc">{searchQuery ? 'Try a different search term.' : 'Log your first activity to get started.'}</div>
      </div>
    );
  }

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, CrmActivity[]> = {};
    for (const a of filtered) {
      const date = formatDate(a.createdAt);
      if (!map[date]) map[date] = [];
      map[date].push(a);
    }
    return Object.entries(map);
  }, [filtered]);

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
      {grouped.map(([date, items]) => (
        <div key={date} style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{
            fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em',
            marginBottom: 'var(--spacing-sm)', fontFamily: 'var(--font-family)',
          }}>
            {date}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((activity) => (
              <div key={activity.id} className="crm-activity-item">
                <div className="crm-activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="crm-activity-body">
                  <div className="crm-activity-text">{activity.body}</div>
                  <div className="crm-activity-meta">
                    {getActivityLabel(activity.type)} &middot; {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main CRM Page ─────────────────────────────────────────────────

export function CrmPage() {
  const { openSettings } = useUIStore();

  // Navigation
  const [activeView, setActiveView] = useState<ActiveView>('pipeline');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [markLostDealId, setMarkLostDealId] = useState<string | null>(null);

  // Data
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.companies ?? [];

  const { data: contactsData } = useContacts();
  const contacts = contactsData?.contacts ?? [];

  const { data: stagesData, isLoading: loadingStages } = useStages();
  const stages = stagesData?.stages ?? [];

  const { data: dealsData, isLoading: loadingDeals } = useDeals();
  const deals = dealsData?.deals ?? [];

  const { data: activitiesData } = useActivities();
  const activities = activitiesData?.activities ?? [];

  const updateDeal = useUpdateDeal();
  const markWon = useMarkDealWon();
  const seedCrm = useSeedCrmData();

  // Auto-seed on first visit
  const hasSeeded = useRef(false);
  useEffect(() => {
    if (
      !loadingStages &&
      !loadingDeals &&
      stages.length === 0 &&
      deals.length === 0 &&
      companies.length === 0 &&
      !hasSeeded.current
    ) {
      hasSeeded.current = true;
      seedCrm.mutate();
    }
  }, [loadingStages, loadingDeals, stages.length, deals.length, companies.length, seedCrm]);

  // Selected entities
  const selectedDeal = selectedDealId ? deals.find((d) => d.id === selectedDealId) : null;
  const selectedContact = selectedContactId ? contacts.find((c) => c.id === selectedContactId) : null;
  const selectedCompany = selectedCompanyId ? companies.find((c) => c.id === selectedCompanyId) : null;

  // Close selection on view change
  useEffect(() => {
    setSelectedDealId(null);
    setSelectedContactId(null);
    setSelectedCompanyId(null);
    setSearchQuery('');
    setShowSearch(false);
  }, [activeView]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showSearch) {
          setShowSearch(false);
          setSearchQuery('');
        } else if (selectedDealId || selectedContactId || selectedCompanyId) {
          setSelectedDealId(null);
          setSelectedContactId(null);
          setSelectedCompanyId(null);
        }
      }
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDealId, selectedContactId, selectedCompanyId, showSearch]);

  // Section title
  const sectionTitle = useMemo(() => {
    switch (activeView) {
      case 'pipeline': return 'Pipeline';
      case 'deals': return 'All deals';
      case 'contacts': return 'Contacts';
      case 'companies': return 'Companies';
      case 'activities': return 'Activities';
    }
  }, [activeView]);

  // Add button
  const handleAdd = () => {
    switch (activeView) {
      case 'pipeline':
      case 'deals':
        setShowCreateDeal(true);
        break;
      case 'contacts':
        setShowCreateContact(true);
        break;
      case 'companies':
        setShowCreateCompany(true);
        break;
      case 'activities':
        setShowLogActivity(true);
        break;
    }
  };

  const addButtonLabel = useMemo(() => {
    switch (activeView) {
      case 'pipeline':
      case 'deals':
        return 'New deal';
      case 'contacts':
        return 'New contact';
      case 'companies':
        return 'New company';
      case 'activities':
        return 'Log activity';
    }
  }, [activeView]);

  // Kanban handlers
  const handleMoveDeal = useCallback((dealId: string, newStageId: string) => {
    const stage = stages.find((s) => s.id === newStageId);
    updateDeal.mutate({
      id: dealId,
      stageId: newStageId,
      probability: stage?.probability ?? 0,
    });
  }, [stages, updateDeal]);

  const handleDealClick = useCallback((dealId: string) => {
    setSelectedDealId(dealId);
    setSelectedContactId(null);
    setSelectedCompanyId(null);
  }, []);

  // Has detail panel
  const hasDetailPanel = !!(
    (activeView === 'pipeline' && selectedDeal) ||
    (activeView === 'deals' && selectedDeal) ||
    (activeView === 'contacts' && selectedContact) ||
    (activeView === 'companies' && selectedCompany)
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <AppSidebar
        storageKey="atlas_crm_sidebar"
        title="CRM"
        footer={
          <SidebarItem
            label="Settings"
            icon={<Settings2 size={14} />}
            onClick={() => openSettings('crm')}
          />
        }
      >
        <SidebarSection>
          <SidebarItem
            label="Pipeline"
            icon={<LayoutGrid size={14} />}
            isActive={activeView === 'pipeline'}
            onClick={() => setActiveView('pipeline')}
          />
          <SidebarItem
            label="Deals"
            icon={<List size={14} />}
            isActive={activeView === 'deals'}
            count={deals.length}
            onClick={() => setActiveView('deals')}
          />
        </SidebarSection>

        <SidebarSection>
          <SidebarItem
            label="Contacts"
            icon={<Users size={14} />}
            isActive={activeView === 'contacts'}
            count={contacts.length}
            onClick={() => setActiveView('contacts')}
          />
          <SidebarItem
            label="Companies"
            icon={<Building2 size={14} />}
            isActive={activeView === 'companies'}
            count={companies.length}
            onClick={() => setActiveView('companies')}
          />
        </SidebarSection>

        <SidebarSection>
          <SidebarItem
            label="Activities"
            icon={<Clock size={14} />}
            isActive={activeView === 'activities'}
            onClick={() => setActiveView('activities')}
          />
        </SidebarSection>
      </AppSidebar>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Content header */}
        <div className="crm-content-header">
          <span className="crm-content-header-title">{sectionTitle}</span>
          <div className="crm-content-header-actions">
            <IconButton
              icon={<Search size={14} />}
              label="Search"
              size={28}
              active={showSearch}
              onClick={() => {
                setShowSearch(!showSearch);
                if (!showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
            />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleAdd}>
              {addButtonLabel}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="crm-search-bar">
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeView}...`}
              iconLeft={<Search size={14} />}
              size="sm"
              style={{ border: 'none', background: 'transparent' }}
            />
            <IconButton
              icon={<X size={14} />}
              label="Close search"
              size={24}
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            />
          </div>
        )}

        {/* Content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {activeView === 'pipeline' && (
              <DealKanban
                deals={deals}
                stages={stages}
                onMoveDeal={handleMoveDeal}
                onDealClick={handleDealClick}
              />
            )}

            {activeView === 'deals' && (
              <DealsListView
                deals={deals}
                selectedId={selectedDealId}
                onSelect={handleDealClick}
                searchQuery={searchQuery}
              />
            )}

            {activeView === 'contacts' && (
              <ContactsListView
                contacts={contacts}
                selectedId={selectedContactId}
                onSelect={(id) => { setSelectedContactId(id); setSelectedDealId(null); setSelectedCompanyId(null); }}
                searchQuery={searchQuery}
              />
            )}

            {activeView === 'companies' && (
              <CompaniesListView
                companies={companies}
                selectedId={selectedCompanyId}
                onSelect={(id) => { setSelectedCompanyId(id); setSelectedDealId(null); setSelectedContactId(null); }}
                searchQuery={searchQuery}
              />
            )}

            {activeView === 'activities' && (
              <ActivitiesListView
                activities={activities}
                searchQuery={searchQuery}
              />
            )}
          </div>

          {/* Detail panel */}
          {hasDetailPanel && (
            <div style={{
              width: 380,
              borderLeft: '1px solid var(--color-border-primary)',
              flexShrink: 0,
              overflow: 'hidden',
              height: '100%',
            }}>
              {(activeView === 'pipeline' || activeView === 'deals') && selectedDeal && (
                <DealDetailPanel
                  deal={selectedDeal}
                  stages={stages}
                  onClose={() => setSelectedDealId(null)}
                  onMarkWon={() => markWon.mutate(selectedDeal.id)}
                  onMarkLost={() => setMarkLostDealId(selectedDeal.id)}
                />
              )}
              {activeView === 'contacts' && selectedContact && (
                <ContactDetailPanel
                  contact={selectedContact}
                  deals={deals}
                  onClose={() => setSelectedContactId(null)}
                />
              )}
              {activeView === 'companies' && selectedCompany && (
                <CompanyDetailPanel
                  company={selectedCompany}
                  contacts={contacts}
                  deals={deals}
                  onClose={() => setSelectedCompanyId(null)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateDealModal
        open={showCreateDeal}
        onClose={() => setShowCreateDeal(false)}
        stages={stages}
        contacts={contacts}
        companies={companies}
      />
      <CreateContactModal
        open={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        companies={companies}
      />
      <CreateCompanyModal
        open={showCreateCompany}
        onClose={() => setShowCreateCompany(false)}
      />
      <LogActivityModal
        open={showLogActivity}
        onClose={() => setShowLogActivity(false)}
        deals={deals}
        contacts={contacts}
        companies={companies}
      />
      {markLostDealId && (
        <MarkLostModal
          open={!!markLostDealId}
          onClose={() => setMarkLostDealId(null)}
          dealId={markLostDealId}
        />
      )}
    </div>
  );
}
