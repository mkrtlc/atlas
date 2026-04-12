// ─── Project ────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Project {
  id: string;
  tenantId: string;
  userId: string;
  companyId: string | null;
  name: string;
  description: string | null;
  billable: boolean;
  status: ProjectStatus;
  estimatedHours: number | null;
  estimatedAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  color: string | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Joined
  companyName?: string;
  totalTrackedMinutes?: number;
  totalBilledAmount?: number;
}

export interface CreateProjInput {
  name: string;
  companyId?: string;
  description?: string;
  billable?: boolean;
  status?: ProjectStatus;
  estimatedHours?: number;
  estimatedAmount?: number;
  startDate?: string;
  endDate?: string;
  color?: string;
}

export interface UpdateProjInput extends Partial<CreateProjInput> {
  sortOrder?: number;
  isArchived?: boolean;
}

// ─── Project Member ─────────────────────────────────────────────────

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  hourlyRate: number | null;
  createdAt: string;
  updatedAt: string;
  // Joined
  userName?: string;
  userEmail?: string;
}

// ─── Rate ────────────────────────────────────────────────────────
export interface ProjectRate {
  id: string;
  tenantId: string;
  title: string;
  factor: number;
  extraPerHour: number;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRateInput {
  title: string;
  factor?: number;
  extraPerHour?: number;
}

export interface UpdateRateInput extends Partial<CreateRateInput> {
  isArchived?: boolean;
  sortOrder?: number;
}

// ─── Time Entry ─────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  tenantId: string;
  userId: string;
  projectId: string;
  durationMinutes: number;
  workDate: string;
  startTime: string | null;
  endTime: string | null;
  billable: boolean;
  billed: boolean;
  paid: boolean;
  locked: boolean;
  invoiceLineItemId: string | null;
  rateId: string | null;
  notes: string | null;
  taskDescription: string | null;
  tags: string[];
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // Joined
  projectName?: string;
  projectColor?: string;
  userName?: string;
  rateName?: string;
}

export interface CreateTimeEntryInput {
  projectId: string;
  durationMinutes: number;
  workDate: string;
  startTime?: string;
  endTime?: string;
  billable?: boolean;
  notes?: string;
  taskDescription?: string;
  tags?: string[];
  rateId?: string;
}

export interface UpdateTimeEntryInput extends Partial<CreateTimeEntryInput> {
  billed?: boolean;
  paid?: boolean;
  locked?: boolean;
  sortOrder?: number;
  isArchived?: boolean;
}

// ─── Project Settings ───────────────────────────────────────────────

export interface ProjectSettings {
  id: string;
  tenantId: string;
  defaultHourlyRate: number;
  companyName: string | null;
  companyAddress: string | null;
  companyLogo: string | null;
  timeRounding: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProjectSettingsInput {
  defaultHourlyRate?: number;
  companyName?: string;
  companyAddress?: string;
  companyLogo?: string;
  timeRounding?: number;
}

// ─── Reports ────────────────────────────────────────────────────────

export interface TimeReport {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  byProject: { projectId: string; projectName: string; minutes: number; billableMinutes: number; paidMinutes: number }[];
  byUser: { userId: string; userName: string; minutes: number; billableMinutes: number }[];
  byDay: { date: string; minutes: number }[];
  byTag: { tag: string; minutes: number; billableMinutes: number }[];
}

export interface RevenueReport {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  byMonth: { month: string; invoiced: number; paid: number }[];
  byClient: { clientId: string; clientName: string; invoiced: number; paid: number }[];
}

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  totalHours: number;
  billableHours: number;
  estimatedAmount: number;
  billedAmount: number;
  paidAmount: number;
}

export interface TeamUtilization {
  userId: string;
  userName: string;
  totalMinutes: number;
  billableMinutes: number;
  utilizationRate: number;
}

// ─── Widget ─────────────────────────────────────────────────────────

export interface ProjectWidgetData {
  activeProjects: number;
  totalTrackedHoursThisWeek: number;
  pendingInvoiceAmount: number;
  overdueInvoiceCount: number;
}
