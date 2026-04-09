import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { LineItemsEditor, type LineItem } from '../components/shared/line-items-editor';
import { TotalsBlock } from '../components/shared/totals-block';
import { config } from '../config/env';
import { formatDate } from '../lib/format';
import axios from 'axios';

const publicApi = axios.create({ baseURL: config.apiUrl });

interface PublicProposal {
  id: string;
  title: string;
  status: string;
  content?: unknown | null;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  currency: string;
  validUntil?: string | null;
  notes?: string | null;
  companyName?: string;
  contactName?: string;
  sentAt?: string | null;
}

export function ProposalPublicPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();

  const { data: proposal, isLoading, error, refetch } = useQuery({
    queryKey: ['proposal-public', token],
    queryFn: async () => {
      const { data } = await publicApi.get(`/crm/proposals/public/${token}`);
      return data.data as PublicProposal;
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await publicApi.post(`/crm/proposals/public/${token}/accept`);
    },
    onSuccess: () => refetch(),
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      await publicApi.post(`/crm/proposals/public/${token}/decline`);
    },
    onSuccess: () => refetch(),
  });

  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const readOnlyLineItems: LineItem[] = useMemo(() => {
    if (!proposal) return [];
    return proposal.lineItems.map((li, i) => ({
      id: String(i),
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      taxRate: li.taxRate,
    }));
  }, [proposal]);

  if (isLoading) {
    return (
      <div style={containerStyle}>
        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
          {t('common.loading')}
        </span>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div style={containerStyle}>
        <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
          {t('crm.proposals.notFound')}
        </span>
      </div>
    );
  }

  const isResponded = proposal.status === 'accepted' || proposal.status === 'declined';

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)' as never,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
              margin: 0,
              marginBottom: 'var(--spacing-sm)',
            }}
          >
            {proposal.title}
          </h1>
          {proposal.companyName && (
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
              {proposal.companyName}
            </div>
          )}
          {proposal.validUntil && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', marginTop: 'var(--spacing-xs)' }}>
              {t('crm.proposals.validUntil')}: {formatDate(proposal.validUntil)}
            </div>
          )}
        </div>

        {/* Scope / terms */}
        {proposal.notes && (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <div style={sectionLabelStyle}>{t('crm.proposals.scopeAndTerms')}</div>
            <div
              style={{
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                color: 'var(--color-text-primary)',
                whiteSpace: 'pre-wrap',
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {proposal.notes}
            </div>
          </div>
        )}

        {/* Line items */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={sectionLabelStyle}>{t('crm.proposals.pricing')}</div>
          <LineItemsEditor items={readOnlyLineItems} onChange={() => {}} readOnly />
        </div>

        {/* Totals */}
        <div style={{ maxWidth: 320, marginLeft: 'auto', marginBottom: 'var(--spacing-xl)' }}>
          <TotalsBlock
            subtotal={proposal.subtotal}
            taxPercent={proposal.taxPercent}
            discountPercent={proposal.discountPercent}
          />
        </div>

        {/* Status or actions */}
        {isResponded ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-lg)',
              background: proposal.status === 'accepted'
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)' as never,
              color: proposal.status === 'accepted' ? 'var(--color-success)' : 'var(--color-error)',
            }}
          >
            {proposal.status === 'accepted' ? (
              <>
                <CheckCircle size={18} />
                {t('crm.proposals.acceptedMessage')}
              </>
            ) : (
              <>
                <XCircle size={18} />
                {t('crm.proposals.declinedMessage')}
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-md)' }}>
            <Button
              variant="primary"
              size="lg"
              icon={<CheckCircle size={16} />}
              onClick={() => setShowAcceptConfirm(true)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {t('crm.proposals.accept')}
            </Button>
            <Button
              variant="danger"
              size="lg"
              icon={<XCircle size={16} />}
              onClick={() => setShowDeclineConfirm(true)}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {t('crm.proposals.decline')}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showAcceptConfirm}
        onOpenChange={setShowAcceptConfirm}
        title={t('crm.proposals.acceptConfirmTitle')}
        description={t('crm.proposals.acceptConfirmDesc')}
        confirmLabel={t('crm.proposals.accept')}
        onConfirm={() => acceptMutation.mutate()}
      />

      <ConfirmDialog
        open={showDeclineConfirm}
        onOpenChange={setShowDeclineConfirm}
        title={t('crm.proposals.declineConfirmTitle')}
        description={t('crm.proposals.declineConfirmDesc')}
        confirmLabel={t('crm.proposals.decline')}
        destructive
        onConfirm={() => declineMutation.mutate()}
      />
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: 'var(--spacing-xl)',
  background: 'var(--color-bg-secondary)',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 800,
  background: 'var(--color-bg-primary)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--spacing-2xl)',
  boxShadow: 'var(--shadow-lg)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)' as never,
  color: 'var(--color-text-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontFamily: 'var(--font-family)',
  marginBottom: 'var(--spacing-sm)',
};
