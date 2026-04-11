/**
 * LeaveTabs — wraps the Leave-related sub-views in a horizontal tab bar.
 *
 * Replaces the old "Leave" sidebar SECTION (with 6 individual sidebar
 * items) with a single sidebar item that opens this tabbed view. The
 * active tab is reflected in the URL via the `tab` search param and
 * persisted to localStorage as a fallback.
 *
 * Tabs are gated by HR app permission: portal-user viewers see only the
 * personal-facing tabs (My leave, Team calendar, Holidays); admins/editors
 * see everything plus Approvals, Leave types, and Policies.
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../components/ui/tabs';
import { useMyAppPermission } from '../../../hooks/use-app-permissions';
import { usePendingApprovals, type HrEmployee } from '../hooks';
import { MyLeaveView } from './views/my-leave-view';
import { ApprovalsView } from './views/approvals-view';
import { TeamCalendarView } from './views/team-calendar-view';
import { LeaveTypesView } from './views/leave-types-view';
import { LeavePoliciesView } from './views/leave-policies-view';
import { HolidaysView } from './views/holidays-view';

const LEAVE_TABS = [
  'my-leave',
  'approvals',
  'team-calendar',
  'leave-types',
  'holidays',
  'policies',
] as const;
type LeaveTabId = typeof LEAVE_TABS[number];

const STORAGE_KEY = 'atlasmail_hr_leave_tab';

function readPersistedTab(): LeaveTabId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (LEAVE_TABS as readonly string[]).includes(raw)) {
      return raw as LeaveTabId;
    }
  } catch { /* ignore */ }
  return null;
}

interface LeaveTabsProps {
  employees: HrEmployee[];
}

export function LeaveTabs({ employees }: LeaveTabsProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: hrPerm } = useMyAppPermission('hr');
  const isPortalUser = hrPerm?.role === 'viewer';
  const isAdmin = hrPerm?.role === 'admin';
  const canApprove = isAdmin || hrPerm?.role === 'editor';
  const { data: pendingApprovals } = usePendingApprovals();
  const pendingApprovalCount = pendingApprovals?.length ?? 0;

  // Resolve the active tab: URL > localStorage > default 'my-leave'.
  const urlTab = searchParams.get('tab') as LeaveTabId | null;
  const persistedTab = readPersistedTab();
  const activeTab: LeaveTabId =
    urlTab && (LEAVE_TABS as readonly string[]).includes(urlTab)
      ? urlTab
      : persistedTab ?? 'my-leave';

  // Sync URL when arriving without a tab param (so the URL is always
  // shareable / bookmarkable).
  useEffect(() => {
    if (!urlTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const handleChange = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch { /* ignore */ }
  };

  const tabs = [
    { id: 'my-leave', label: t('hr.sidebar.myLeave') },
    {
      id: 'approvals',
      label: t('hr.sidebar.approvals'),
      count: pendingApprovalCount,
      hidden: !canApprove,
    },
    { id: 'team-calendar', label: t('hr.sidebar.teamCalendar') },
    { id: 'leave-types', label: t('hr.sidebar.leaveTypes'), hidden: isPortalUser },
    { id: 'holidays', label: t('hr.sidebar.holidays') },
    { id: 'policies', label: t('hr.sidebar.policies'), hidden: isPortalUser },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={handleChange} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'my-leave' && <MyLeaveView employees={employees} />}
        {activeTab === 'approvals' && canApprove && <ApprovalsView />}
        {activeTab === 'team-calendar' && <TeamCalendarView />}
        {activeTab === 'leave-types' && !isPortalUser && <LeaveTypesView />}
        {activeTab === 'holidays' && <HolidaysView />}
        {activeTab === 'policies' && !isPortalUser && <LeavePoliciesView />}
      </div>
    </div>
  );
}
