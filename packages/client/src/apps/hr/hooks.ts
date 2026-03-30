import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';

// ─── Inline Types ──────────────────────────────────────────────────

export interface HrEmployee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  departmentId: string | null;
  status: 'active' | 'on-leave' | 'terminated';
  startDate: string;
  avatarUrl: string | null;
  tags: string[];
  notes: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  employmentType: string;
  managerId: string | null;
  jobTitle: string | null;
  workLocation: string | null;
  salary: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  departmentName?: string | null;
  departmentColor?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrDepartment {
  id: string;
  name: string;
  description: string | null;
  color: string;
  headEmployeeId: string | null;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface HrTimeOff {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'vacation' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrCounts {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveEmployees: number;
  terminatedEmployees: number;
  pendingTimeOff: number;
  departments: number;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveType: string;
  year: number;
  allocated: number;
  used: number;
  carried: number;
}

export interface OnboardingTask {
  id: string;
  employeeId: string;
  title: string;
  description: string | null;
  category: string;
  dueDate: string | null;
  completedAt: string | null;
  completedBy: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  tasks: Array<{ title: string; description?: string; category: string }>;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  name: string;
  type: string;
  storagePath: string;
  mimeType: string | null;
  size: number | null;
  expiresAt: string | null;
  notes: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface HrDashboardData {
  totalHeadcount: number;
  statusCounts: Record<string, number>;
  departmentCounts: { name: string; color: string; count: number }[];
  typeCounts: Record<string, number>;
  upcomingBirthdays: { id: string; name: string; dateOfBirth: string; avatarUrl: string | null }[];
  pendingRequests: number;
  approvedDaysThisMonth: number;
  recentHires: { id: string; name: string; startDate: string; role: string; avatarUrl: string | null }[];
  tenure: Record<string, number>;
}

// ─── Employee Queries ──────────────────────────────────────────────

export function useEmployeeList(
  filters?: { status?: string; departmentId?: string; includeArchived?: boolean },
  options?: { enabled?: boolean },
) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: queryKeys.hr.employees.list(filterKey),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.departmentId) params.set('departmentId', filters.departmentId);
      if (filters?.includeArchived) params.set('includeArchived', 'true');
      const qs = params.toString();
      const { data } = await api.get(`/hr${qs ? `?${qs}` : ''}`);
      return data.data as { employees: HrEmployee[] };
    },
    staleTime: 15_000,
    enabled: options?.enabled,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hr.employees.detail(id!),
    queryFn: async () => {
      const { data } = await api.get(`/hr/${id}`);
      return data.data as HrEmployee;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useEmployeeCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.employees.counts,
    queryFn: async () => {
      const { data } = await api.get('/hr/counts');
      return data.data as HrCounts;
    },
    staleTime: 15_000,
    enabled: options?.enabled,
  });
}

// ─── Employee Mutations ────────────────────────────────────────────

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<HrEmployee, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await api.post('/hr', input);
      return data.data as HrEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<HrEmployee> & { id: string }) => {
      const { data } = await api.patch(`/hr/${id}`, input);
      return data.data as HrEmployee;
    },
    onSuccess: (employee) => {
      queryClient.setQueryData(queryKeys.hr.employees.detail(employee.id), employee);
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

// ─── Department Queries & Mutations ────────────────────────────────

export function useDepartmentList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.departments.list,
    queryFn: async () => {
      const { data } = await api.get('/hr/departments/list');
      return data.data as { departments: HrDepartment[] };
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<HrDepartment, 'id' | 'employeeCount' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await api.post('/hr/departments', input);
      return data.data as HrDepartment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<HrDepartment> & { id: string }) => {
      const { data } = await api.patch(`/hr/departments/${id}`, input);
      return data.data as HrDepartment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

// ─── Time Off Queries & Mutations ──────────────────────────────────

export function useTimeOffList(
  filters?: { employeeId?: string; status?: string; type?: string },
  options?: { enabled?: boolean },
) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: queryKeys.hr.timeOff.list(filterKey),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.employeeId) params.set('employeeId', filters.employeeId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.type) params.set('type', filters.type);
      const qs = params.toString();
      const { data } = await api.get(`/hr/time-off/list${qs ? `?${qs}` : ''}`);
      return data.data as { timeOffRequests: HrTimeOff[] };
    },
    staleTime: 15_000,
    enabled: options?.enabled,
  });
}

export function useCreateTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<HrTimeOff, 'id' | 'employeeName' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await api.post('/hr/time-off', input);
      return data.data as HrTimeOff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useUpdateTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<HrTimeOff> & { id: string }) => {
      const { data } = await api.patch(`/hr/time-off/${id}`, input);
      return data.data as HrTimeOff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/hr/time-off/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

// ─── Dashboard ─────────────────────────────────────────────────────

export function useHrDashboard(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.hr.dashboard,
    queryFn: async () => {
      const { data } = await api.get('/hr/dashboard');
      return data.data as HrDashboardData;
    },
    staleTime: 30_000,
    enabled: options?.enabled,
  });
}

// ─── Leave Balances ────────────────────────────────────────────────

export function useLeaveBalances(employeeId: string | undefined, year?: number) {
  return useQuery({
    queryKey: queryKeys.hr.leaveBalances(employeeId!),
    queryFn: async () => {
      const params = year ? `?year=${year}` : '';
      const { data } = await api.get(`/hr/${employeeId}/leave-balances${params}`);
      return data.data as LeaveBalance[];
    },
    enabled: !!employeeId,
    staleTime: 15_000,
  });
}

export function useAllocateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, ...input }: { employeeId: string; leaveType: string; year: number; days: number }) => {
      const { data } = await api.post(`/hr/${employeeId}/leave-balances`, input);
      return data.data as LeaveBalance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

// ─── Onboarding ────────────────────────────────────────────────────

export function useOnboardingTasks(employeeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hr.onboarding(employeeId!),
    queryFn: async () => {
      const { data } = await api.get(`/hr/${employeeId}/onboarding`);
      return data.data as OnboardingTask[];
    },
    enabled: !!employeeId,
    staleTime: 15_000,
  });
}

export function useCreateOnboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, ...input }: { employeeId: string; title: string; description?: string; category?: string; dueDate?: string }) => {
      const { data } = await api.post(`/hr/${employeeId}/onboarding`, input);
      return data.data as OnboardingTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useUpdateOnboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...input }: { taskId: string; completed?: boolean; title?: string; description?: string; isArchived?: boolean }) => {
      const { data } = await api.patch(`/hr/onboarding/${taskId}`, input);
      return data.data as OnboardingTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useDeleteOnboardingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/hr/onboarding/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useApplyOnboardingTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, templateId }: { employeeId: string; templateId: string }) => {
      const { data } = await api.post(`/hr/${employeeId}/onboarding/from-template`, { templateId });
      return data.data as OnboardingTask[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useOnboardingTemplates() {
  return useQuery({
    queryKey: queryKeys.hr.onboardingTemplates,
    queryFn: async () => {
      const { data } = await api.get('/hr/onboarding-templates');
      return data.data as OnboardingTemplate[];
    },
    staleTime: 60_000,
  });
}

// ─── Employee Documents ────────────────────────────────────────────

export function useEmployeeDocuments(employeeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hr.documents(employeeId!),
    queryFn: async () => {
      const { data } = await api.get(`/hr/${employeeId}/documents`);
      return data.data as EmployeeDocument[];
    },
    enabled: !!employeeId,
    staleTime: 15_000,
  });
}

export function useUploadEmployeeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, file, type, expiresAt, notes }: {
      employeeId: string; file: File; type?: string; expiresAt?: string; notes?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (type) formData.append('type', type);
      if (expiresAt) formData.append('expiresAt', expiresAt);
      if (notes) formData.append('notes', notes);

      const { data } = await api.post(`/hr/${employeeId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as EmployeeDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

export function useDeleteEmployeeDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/hr/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}

// ─── Seed ──────────────────────────────────────────────────────────

export function useSeedHrData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/hr/seed');
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hr.all });
    },
  });
}
