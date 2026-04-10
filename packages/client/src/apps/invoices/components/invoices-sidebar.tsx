import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, List, FileEdit, Send, AlertTriangle, CheckCircle2, XCircle, Settings2,
} from 'lucide-react';
import { AppSidebar, SidebarSection, SidebarItem } from '../../../components/layout/app-sidebar';
import { useUIStore } from '../../../stores/ui-store';

interface InvoicesSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  counts?: Record<string, number>;
}

export function InvoicesSidebar({ activeView, setActiveView, counts }: InvoicesSidebarProps) {
  const { t } = useTranslation();
  const { openSettings } = useUIStore();

  return (
    <AppSidebar
      storageKey="atlas_invoices_sidebar"
      title={t('invoices.title')}
      footer={
        <SidebarItem
          label={t('invoices.sidebar.settings')}
          icon={<Settings2 size={14} />}
          onClick={() => openSettings('invoices')}
        />
      }
    >
      <SidebarSection>
        <SidebarItem
          label={t('invoices.dashboard.title')}
          icon={<LayoutDashboard size={14} />}
          iconColor="#6366f1"
          isActive={activeView === 'dashboard'}
          onClick={() => setActiveView('dashboard')}
        />
        <SidebarItem
          label={t('invoices.sidebar.all')}
          icon={<List size={14} />}
          iconColor="#0ea5e9"
          isActive={activeView === 'all'}
          count={counts?.all}
          onClick={() => setActiveView('all')}
        />
        <SidebarItem
          label={t('invoices.sidebar.draft')}
          icon={<FileEdit size={14} />}
          iconColor="#6b7280"
          isActive={activeView === 'draft'}
          count={counts?.draft}
          onClick={() => setActiveView('draft')}
        />
        <SidebarItem
          label={t('invoices.sidebar.sent')}
          icon={<Send size={14} />}
          iconColor="#3b82f6"
          isActive={activeView === 'sent'}
          count={counts?.sent}
          onClick={() => setActiveView('sent')}
        />
        <SidebarItem
          label={t('invoices.sidebar.overdue')}
          icon={<AlertTriangle size={14} />}
          iconColor="#ef4444"
          isActive={activeView === 'overdue'}
          count={counts?.overdue}
          onClick={() => setActiveView('overdue')}
        />
        <SidebarItem
          label={t('invoices.sidebar.paid')}
          icon={<CheckCircle2 size={14} />}
          iconColor="#10b981"
          isActive={activeView === 'paid'}
          count={counts?.paid}
          onClick={() => setActiveView('paid')}
        />
        <SidebarItem
          label={t('invoices.sidebar.waived')}
          icon={<XCircle size={14} />}
          iconColor="#f59e0b"
          isActive={activeView === 'waived'}
          count={counts?.waived}
          onClick={() => setActiveView('waived')}
        />
      </SidebarSection>
    </AppSidebar>
  );
}
