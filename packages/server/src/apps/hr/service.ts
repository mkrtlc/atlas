import { db } from '../../config/database';
import { employees, departments, timeOffRequests, leaveBalances, onboardingTasks, onboardingTemplates, employeeDocuments } from '../../db/schema';
import { eq, and, asc, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../../utils/logger';

interface CreateEmployeeInput {
  name: string;
  email: string;
  role?: string;
  departmentId?: string | null;
  startDate?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status?: string;
  linkedUserId?: string | null;
  tags?: string[];
  dateOfBirth?: string | null;
  gender?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  employmentType?: string;
  managerId?: string | null;
  jobTitle?: string | null;
  workLocation?: string | null;
  salary?: number | null;
  salaryCurrency?: string;
  salaryPeriod?: string;
}

interface UpdateEmployeeInput extends Partial<CreateEmployeeInput> {
  sortOrder?: number;
  isArchived?: boolean;
}

interface CreateDepartmentInput {
  name: string;
  headEmployeeId?: string | null;
  color?: string;
  description?: string | null;
}

interface UpdateDepartmentInput extends Partial<CreateDepartmentInput> {
  sortOrder?: number;
  isArchived?: boolean;
}

interface CreateTimeOffRequestInput {
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  approverId?: string | null;
  notes?: string | null;
}

interface UpdateTimeOffRequestInput extends Partial<Omit<CreateTimeOffRequestInput, 'employeeId'>> {
  status?: string;
  sortOrder?: number;
  isArchived?: boolean;
}

// ─── Employees ──────────────────────────────────────────────────────

export async function listEmployees(userId: string, accountId: string, filters?: {
  status?: string;
  departmentId?: string;
  includeArchived?: boolean;
}) {
  const conditions = [eq(employees.userId, userId), eq(employees.accountId, accountId)];

  if (!filters?.includeArchived) {
    conditions.push(eq(employees.isArchived, false));
  }
  if (filters?.status) {
    conditions.push(eq(employees.status, filters.status));
  }
  if (filters?.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }

  const employeeSelect = {
    id: employees.id,
    accountId: employees.accountId,
    userId: employees.userId,
    linkedUserId: employees.linkedUserId,
    name: employees.name,
    email: employees.email,
    role: employees.role,
    departmentId: employees.departmentId,
    startDate: employees.startDate,
    phone: employees.phone,
    avatarUrl: employees.avatarUrl,
    status: employees.status,
    tags: employees.tags,
    dateOfBirth: employees.dateOfBirth,
    gender: employees.gender,
    emergencyContactName: employees.emergencyContactName,
    emergencyContactPhone: employees.emergencyContactPhone,
    emergencyContactRelation: employees.emergencyContactRelation,
    employmentType: employees.employmentType,
    managerId: employees.managerId,
    jobTitle: employees.jobTitle,
    workLocation: employees.workLocation,
    salary: employees.salary,
    salaryCurrency: employees.salaryCurrency,
    salaryPeriod: employees.salaryPeriod,
    sortOrder: employees.sortOrder,
    isArchived: employees.isArchived,
    createdAt: employees.createdAt,
    updatedAt: employees.updatedAt,
    departmentName: departments.name,
    departmentColor: departments.color,
  };

  return db
    .select(employeeSelect)
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(...conditions))
    .orderBy(asc(employees.sortOrder), asc(employees.createdAt));
}

export async function getEmployee(userId: string, id: string) {
  const [employee] = await db
    .select({
      id: employees.id,
      accountId: employees.accountId,
      userId: employees.userId,
      linkedUserId: employees.linkedUserId,
      name: employees.name,
      email: employees.email,
      role: employees.role,
      departmentId: employees.departmentId,
      startDate: employees.startDate,
      phone: employees.phone,
      avatarUrl: employees.avatarUrl,
      status: employees.status,
      tags: employees.tags,
      dateOfBirth: employees.dateOfBirth,
      gender: employees.gender,
      emergencyContactName: employees.emergencyContactName,
      emergencyContactPhone: employees.emergencyContactPhone,
      emergencyContactRelation: employees.emergencyContactRelation,
      employmentType: employees.employmentType,
      managerId: employees.managerId,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      salary: employees.salary,
      salaryCurrency: employees.salaryCurrency,
      salaryPeriod: employees.salaryPeriod,
      sortOrder: employees.sortOrder,
      isArchived: employees.isArchived,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      departmentName: departments.name,
      departmentColor: departments.color,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(employees.id, id), eq(employees.userId, userId)))
    .limit(1);

  return employee || null;
}

export async function createEmployee(userId: string, accountId: string, input: CreateEmployeeInput) {
  const now = new Date();

  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${employees.sortOrder}), -1)` })
    .from(employees)
    .where(eq(employees.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(employees)
    .values({
      accountId,
      userId,
      name: input.name,
      email: input.email,
      role: input.role ?? '',
      departmentId: input.departmentId ?? null,
      startDate: input.startDate ?? null,
      phone: input.phone ?? null,
      avatarUrl: input.avatarUrl ?? null,
      status: input.status ?? 'active',
      linkedUserId: input.linkedUserId ?? null,
      tags: input.tags ?? [],
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelation: input.emergencyContactRelation ?? null,
      employmentType: input.employmentType ?? 'full-time',
      managerId: input.managerId ?? null,
      jobTitle: input.jobTitle ?? null,
      workLocation: input.workLocation ?? null,
      salary: input.salary ?? null,
      salaryCurrency: input.salaryCurrency ?? 'USD',
      salaryPeriod: input.salaryPeriod ?? 'yearly',
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, employeeId: created.id }, 'Employee created');
  return created;
}

export async function updateEmployee(userId: string, id: string, input: UpdateEmployeeInput) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.role !== undefined) updates.role = input.role;
  if (input.departmentId !== undefined) updates.departmentId = input.departmentId;
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl;
  if (input.status !== undefined) updates.status = input.status;
  if (input.linkedUserId !== undefined) updates.linkedUserId = input.linkedUserId;
  if (input.tags !== undefined) updates.tags = input.tags;
  if (input.dateOfBirth !== undefined) updates.dateOfBirth = input.dateOfBirth;
  if (input.gender !== undefined) updates.gender = input.gender;
  if (input.emergencyContactName !== undefined) updates.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactPhone !== undefined) updates.emergencyContactPhone = input.emergencyContactPhone;
  if (input.emergencyContactRelation !== undefined) updates.emergencyContactRelation = input.emergencyContactRelation;
  if (input.employmentType !== undefined) updates.employmentType = input.employmentType;
  if (input.managerId !== undefined) updates.managerId = input.managerId;
  if (input.jobTitle !== undefined) updates.jobTitle = input.jobTitle;
  if (input.workLocation !== undefined) updates.workLocation = input.workLocation;
  if (input.salary !== undefined) updates.salary = input.salary;
  if (input.salaryCurrency !== undefined) updates.salaryCurrency = input.salaryCurrency;
  if (input.salaryPeriod !== undefined) updates.salaryPeriod = input.salaryPeriod;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await db
    .update(employees)
    .set(updates)
    .where(and(eq(employees.id, id), eq(employees.userId, userId)));

  const [updated] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.id, id), eq(employees.userId, userId)))
    .limit(1);

  return updated || null;
}

export async function deleteEmployee(userId: string, id: string) {
  await updateEmployee(userId, id, { isArchived: true });
}

export async function searchEmployees(userId: string, accountId: string, query: string) {
  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.userId, userId),
        eq(employees.accountId, accountId),
        eq(employees.isArchived, false),
        sql`(${employees.name} ILIKE ${searchTerm} OR ${employees.email} ILIKE ${searchTerm} OR ${employees.role} ILIKE ${searchTerm})`,
      ),
    )
    .orderBy(desc(employees.updatedAt))
    .limit(30);
}

export async function getEmployeeCounts(userId: string, accountId: string) {
  const allEmployees = await db
    .select({ status: employees.status })
    .from(employees)
    .where(and(eq(employees.userId, userId), eq(employees.accountId, accountId), eq(employees.isArchived, false)));

  const counts: Record<string, number> = { active: 0, 'on-leave': 0, terminated: 0, total: 0 };

  for (const e of allEmployees) {
    counts.total++;
    if (e.status in counts) {
      counts[e.status]++;
    }
  }

  return counts;
}

// ─── Departments ────────────────────────────────────────────────────

export async function listDepartments(userId: string, accountId: string, includeArchived = false) {
  const conditions = [eq(departments.userId, userId), eq(departments.accountId, accountId)];
  if (!includeArchived) {
    conditions.push(eq(departments.isArchived, false));
  }

  const rows = await db
    .select({
      id: departments.id,
      accountId: departments.accountId,
      userId: departments.userId,
      name: departments.name,
      headEmployeeId: departments.headEmployeeId,
      color: departments.color,
      description: departments.description,
      sortOrder: departments.sortOrder,
      isArchived: departments.isArchived,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      employeeCount: sql<number>`(SELECT COUNT(*) FROM employees WHERE department_id = ${departments.id} AND is_archived = false)`.as('employee_count'),
    })
    .from(departments)
    .where(and(...conditions))
    .orderBy(asc(departments.sortOrder), asc(departments.createdAt));

  return rows;
}

export async function getDepartment(userId: string, accountId: string, id: string) {
  const [department] = await db
    .select({
      id: departments.id,
      accountId: departments.accountId,
      userId: departments.userId,
      name: departments.name,
      headEmployeeId: departments.headEmployeeId,
      color: departments.color,
      description: departments.description,
      sortOrder: departments.sortOrder,
      isArchived: departments.isArchived,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      employeeCount: sql<number>`(SELECT COUNT(*) FROM employees WHERE department_id = ${departments.id} AND is_archived = false)`.as('employee_count'),
    })
    .from(departments)
    .where(and(eq(departments.id, id), eq(departments.userId, userId), eq(departments.accountId, accountId)))
    .limit(1);

  return department || null;
}

export async function createDepartment(userId: string, accountId: string, input: CreateDepartmentInput) {
  const now = new Date();

  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${departments.sortOrder}), -1)` })
    .from(departments)
    .where(eq(departments.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(departments)
    .values({
      accountId,
      userId,
      name: input.name || 'Untitled department',
      headEmployeeId: input.headEmployeeId ?? null,
      color: input.color ?? '#5a7fa0',
      description: input.description ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, departmentId: created.id }, 'Department created');
  return created;
}

export async function updateDepartment(userId: string, accountId: string, id: string, input: UpdateDepartmentInput) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.headEmployeeId !== undefined) updates.headEmployeeId = input.headEmployeeId;
  if (input.color !== undefined) updates.color = input.color;
  if (input.description !== undefined) updates.description = input.description;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await db
    .update(departments)
    .set(updates)
    .where(and(eq(departments.id, id), eq(departments.userId, userId), eq(departments.accountId, accountId)));

  const [updated] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.id, id), eq(departments.userId, userId), eq(departments.accountId, accountId)))
    .limit(1);

  return updated || null;
}

export async function deleteDepartment(userId: string, accountId: string, id: string) {
  await updateDepartment(userId, accountId, id, { isArchived: true });
}

// ─── Time Off Requests ──────────────────────────────────────────────

export async function listTimeOffRequests(userId: string, accountId: string, filters?: {
  employeeId?: string;
  status?: string;
  type?: string;
  includeArchived?: boolean;
}) {
  const conditions = [eq(timeOffRequests.userId, userId), eq(timeOffRequests.accountId, accountId)];

  if (!filters?.includeArchived) {
    conditions.push(eq(timeOffRequests.isArchived, false));
  }
  if (filters?.employeeId) {
    conditions.push(eq(timeOffRequests.employeeId, filters.employeeId));
  }
  if (filters?.status) {
    conditions.push(eq(timeOffRequests.status, filters.status));
  }
  if (filters?.type) {
    conditions.push(eq(timeOffRequests.type, filters.type));
  }

  return db
    .select({
      id: timeOffRequests.id,
      accountId: timeOffRequests.accountId,
      userId: timeOffRequests.userId,
      employeeId: timeOffRequests.employeeId,
      type: timeOffRequests.type,
      startDate: timeOffRequests.startDate,
      endDate: timeOffRequests.endDate,
      status: timeOffRequests.status,
      approverId: timeOffRequests.approverId,
      notes: timeOffRequests.notes,
      sortOrder: timeOffRequests.sortOrder,
      isArchived: timeOffRequests.isArchived,
      createdAt: timeOffRequests.createdAt,
      updatedAt: timeOffRequests.updatedAt,
      employeeName: employees.name,
    })
    .from(timeOffRequests)
    .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
    .where(and(...conditions))
    .orderBy(desc(timeOffRequests.createdAt));
}

export async function createTimeOffRequest(userId: string, accountId: string, input: CreateTimeOffRequestInput) {
  const now = new Date();

  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${timeOffRequests.sortOrder}), -1)` })
    .from(timeOffRequests)
    .where(eq(timeOffRequests.userId, userId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(timeOffRequests)
    .values({
      accountId,
      userId,
      employeeId: input.employeeId,
      type: input.type ?? 'vacation',
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'pending',
      approverId: input.approverId ?? null,
      notes: input.notes ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, timeOffRequestId: created.id }, 'Time-off request created');
  return created;
}

export async function updateTimeOffRequest(userId: string, accountId: string, id: string, input: UpdateTimeOffRequestInput) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.type !== undefined) updates.type = input.type;
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.endDate !== undefined) updates.endDate = input.endDate;
  if (input.status !== undefined) updates.status = input.status;
  if (input.approverId !== undefined) updates.approverId = input.approverId;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  await db
    .update(timeOffRequests)
    .set(updates)
    .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.userId, userId), eq(timeOffRequests.accountId, accountId)));

  const [updated] = await db
    .select()
    .from(timeOffRequests)
    .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.userId, userId), eq(timeOffRequests.accountId, accountId)))
    .limit(1);

  return updated || null;
}

export async function deleteTimeOffRequest(userId: string, accountId: string, id: string) {
  await updateTimeOffRequest(userId, accountId, id, { isArchived: true });
}

// ─── Leave Balances ────────────────────────────────────────────────

export async function getLeaveBalances(accountId: string, employeeId: string, year: number) {
  return db
    .select()
    .from(leaveBalances)
    .where(and(
      eq(leaveBalances.accountId, accountId),
      eq(leaveBalances.employeeId, employeeId),
      eq(leaveBalances.year, year),
    ))
    .orderBy(asc(leaveBalances.leaveType));
}

export async function allocateLeave(accountId: string, employeeId: string, leaveType: string, year: number, days: number) {
  const now = new Date();
  const existing = await db
    .select()
    .from(leaveBalances)
    .where(and(
      eq(leaveBalances.accountId, accountId),
      eq(leaveBalances.employeeId, employeeId),
      eq(leaveBalances.leaveType, leaveType),
      eq(leaveBalances.year, year),
    ))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(leaveBalances)
      .set({ allocated: days, updatedAt: now })
      .where(eq(leaveBalances.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(leaveBalances)
    .values({
      accountId,
      employeeId,
      leaveType,
      year,
      allocated: days,
      used: 0,
      carried: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function updateUsedLeave(accountId: string, employeeId: string, leaveType: string, year: number) {
  // Calculate used days from approved time-off requests in the given year
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const approvedRequests = await db
    .select({ startDate: timeOffRequests.startDate, endDate: timeOffRequests.endDate })
    .from(timeOffRequests)
    .where(and(
      eq(timeOffRequests.accountId, accountId),
      eq(timeOffRequests.employeeId, employeeId),
      eq(timeOffRequests.type, leaveType),
      eq(timeOffRequests.status, 'approved'),
      eq(timeOffRequests.isArchived, false),
      gte(timeOffRequests.startDate, yearStart),
      lte(timeOffRequests.endDate, yearEnd),
    ));

  let totalDays = 0;
  for (const req of approvedRequests) {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    totalDays += diff;
  }

  const now = new Date();
  await db
    .update(leaveBalances)
    .set({ used: totalDays, updatedAt: now })
    .where(and(
      eq(leaveBalances.accountId, accountId),
      eq(leaveBalances.employeeId, employeeId),
      eq(leaveBalances.leaveType, leaveType),
      eq(leaveBalances.year, year),
    ));

  return totalDays;
}

export async function getLeaveBalancesSummary(accountId: string) {
  return db
    .select()
    .from(leaveBalances)
    .where(eq(leaveBalances.accountId, accountId))
    .orderBy(asc(leaveBalances.employeeId), asc(leaveBalances.leaveType));
}

// ─── Dashboard ─────────────────────────────────────────────────────

export async function getDashboardData(userId: string, accountId: string) {
  const allEmployees = await db
    .select()
    .from(employees)
    .where(and(eq(employees.userId, userId), eq(employees.accountId, accountId), eq(employees.isArchived, false)));

  const allDepartments = await db
    .select()
    .from(departments)
    .where(and(eq(departments.userId, userId), eq(departments.accountId, accountId), eq(departments.isArchived, false)));

  const allTimeOff = await db
    .select()
    .from(timeOffRequests)
    .where(and(eq(timeOffRequests.userId, userId), eq(timeOffRequests.accountId, accountId), eq(timeOffRequests.isArchived, false)));

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Count by status
  const statusCounts: Record<string, number> = { active: 0, 'on-leave': 0, terminated: 0 };
  for (const emp of allEmployees) {
    if (emp.status in statusCounts) statusCounts[emp.status]++;
  }

  // Count by department
  const departmentCounts: { name: string; color: string; count: number }[] = [];
  for (const dept of allDepartments) {
    const count = allEmployees.filter((e) => e.departmentId === dept.id).length;
    departmentCounts.push({ name: dept.name, color: dept.color, count });
  }
  const noDeptCount = allEmployees.filter((e) => !e.departmentId).length;
  if (noDeptCount > 0) {
    departmentCounts.push({ name: 'Unassigned', color: '#94a3b8', count: noDeptCount });
  }

  // Count by employment type
  const typeCounts: Record<string, number> = {};
  for (const emp of allEmployees) {
    const t = emp.employmentType || 'full-time';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  // Upcoming birthdays (next 30 days)
  const upcomingBirthdays: { id: string; name: string; dateOfBirth: string; avatarUrl: string | null }[] = [];
  for (const emp of allEmployees) {
    if (!emp.dateOfBirth) continue;
    const dob = new Date(emp.dateOfBirth);
    const thisYearBday = new Date(currentYear, dob.getMonth(), dob.getDate());
    if (thisYearBday < now) thisYearBday.setFullYear(currentYear + 1);
    if (thisYearBday <= thirtyDaysFromNow) {
      upcomingBirthdays.push({ id: emp.id, name: emp.name, dateOfBirth: emp.dateOfBirth, avatarUrl: emp.avatarUrl });
    }
  }

  // Leave stats
  const pendingRequests = allTimeOff.filter((t) => t.status === 'pending').length;
  let approvedDaysThisMonth = 0;
  for (const req of allTimeOff) {
    if (req.status !== 'approved') continue;
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    if (start.getMonth() === currentMonth && start.getFullYear() === currentYear) {
      approvedDaysThisMonth += Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  // Recent hires (last 30 days)
  const recentHires = allEmployees
    .filter((e) => e.startDate && new Date(e.startDate) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime())
    .slice(0, 5)
    .map((e) => ({ id: e.id, name: e.name, startDate: e.startDate!, role: e.role, avatarUrl: e.avatarUrl }));

  // Tenure distribution
  const tenure = { '0-1yr': 0, '1-3yr': 0, '3-5yr': 0, '5yr+': 0 };
  for (const emp of allEmployees) {
    if (!emp.startDate) continue;
    const years = (now.getTime() - new Date(emp.startDate).getTime()) / (365.25 * 86400000);
    if (years < 1) tenure['0-1yr']++;
    else if (years < 3) tenure['1-3yr']++;
    else if (years < 5) tenure['3-5yr']++;
    else tenure['5yr+']++;
  }

  return {
    totalHeadcount: allEmployees.length,
    statusCounts,
    departmentCounts,
    typeCounts,
    upcomingBirthdays,
    pendingRequests,
    approvedDaysThisMonth,
    recentHires,
    tenure,
  };
}

// ─── Onboarding Tasks ──────────────────────────────────────────────

export async function listOnboardingTasks(accountId: string, employeeId: string) {
  return db
    .select()
    .from(onboardingTasks)
    .where(and(
      eq(onboardingTasks.accountId, accountId),
      eq(onboardingTasks.employeeId, employeeId),
      eq(onboardingTasks.isArchived, false),
    ))
    .orderBy(asc(onboardingTasks.sortOrder), asc(onboardingTasks.createdAt));
}

export async function createOnboardingTask(accountId: string, employeeId: string, input: {
  title: string;
  description?: string | null;
  category?: string;
  dueDate?: string | null;
}) {
  const now = new Date();
  const [maxSort] = await db
    .select({ max: sql<number>`COALESCE(MAX(${onboardingTasks.sortOrder}), -1)` })
    .from(onboardingTasks)
    .where(eq(onboardingTasks.employeeId, employeeId));

  const sortOrder = (maxSort?.max ?? -1) + 1;

  const [created] = await db
    .insert(onboardingTasks)
    .values({
      accountId,
      employeeId,
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? 'general',
      dueDate: input.dueDate ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function updateOnboardingTask(accountId: string, taskId: string, input: {
  title?: string;
  description?: string | null;
  category?: string;
  dueDate?: string | null;
  completedAt?: Date | null;
  completedBy?: string | null;
  sortOrder?: number;
  isArchived?: boolean;
}) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.category !== undefined) updates.category = input.category;
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
  if (input.completedAt !== undefined) updates.completedAt = input.completedAt;
  if (input.completedBy !== undefined) updates.completedBy = input.completedBy;
  if (input.sortOrder !== undefined) updates.sortOrder = input.sortOrder;
  if (input.isArchived !== undefined) updates.isArchived = input.isArchived;

  const [updated] = await db
    .update(onboardingTasks)
    .set(updates)
    .where(and(eq(onboardingTasks.id, taskId), eq(onboardingTasks.accountId, accountId)))
    .returning();

  return updated || null;
}

export async function deleteOnboardingTask(accountId: string, taskId: string) {
  return updateOnboardingTask(accountId, taskId, { isArchived: true });
}

export async function createTasksFromTemplate(accountId: string, employeeId: string, templateId: string) {
  const [template] = await db
    .select()
    .from(onboardingTemplates)
    .where(and(eq(onboardingTemplates.id, templateId), eq(onboardingTemplates.accountId, accountId)))
    .limit(1);

  if (!template) return [];

  const created = [];
  for (const task of template.tasks) {
    const t = await createOnboardingTask(accountId, employeeId, {
      title: task.title,
      description: task.description ?? null,
      category: task.category,
    });
    created.push(t);
  }

  return created;
}

// ─── Onboarding Templates ──────────────────────────────────────────

export async function listOnboardingTemplates(accountId: string) {
  return db
    .select()
    .from(onboardingTemplates)
    .where(eq(onboardingTemplates.accountId, accountId))
    .orderBy(asc(onboardingTemplates.name));
}

export async function createOnboardingTemplate(accountId: string, input: {
  name: string;
  tasks: Array<{ title: string; description?: string; category: string }>;
}) {
  const now = new Date();
  const [created] = await db
    .insert(onboardingTemplates)
    .values({
      accountId,
      name: input.name,
      tasks: input.tasks,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function seedDefaultTemplate(accountId: string) {
  const existing = await db
    .select({ id: onboardingTemplates.id })
    .from(onboardingTemplates)
    .where(eq(onboardingTemplates.accountId, accountId))
    .limit(1);

  if (existing.length > 0) return null;

  return createOnboardingTemplate(accountId, {
    name: 'Default onboarding',
    tasks: [
      { title: 'Set up email account', description: 'Create company email and set up mail client', category: 'IT' },
      { title: 'Complete tax forms', description: 'Fill out W-4 and state tax withholding forms', category: 'HR' },
      { title: 'Review employee handbook', description: 'Read the company handbook and sign acknowledgment', category: 'HR' },
      { title: 'Set up workstation', description: 'Configure laptop, monitors, and software', category: 'IT' },
      { title: 'Meet team members', description: 'Schedule introductions with direct team', category: 'Team' },
      { title: 'Schedule orientation', description: 'Attend company orientation session', category: 'HR' },
      { title: 'Assign mentor', description: 'Get paired with a team mentor', category: 'Team' },
      { title: 'Review benefits enrollment', description: 'Review and enroll in health, dental, and vision plans', category: 'HR' },
    ],
  });
}

// ─── Employee Documents ────────────────────────────────────────────

export async function listEmployeeDocuments(accountId: string, employeeId: string) {
  return db
    .select()
    .from(employeeDocuments)
    .where(and(
      eq(employeeDocuments.accountId, accountId),
      eq(employeeDocuments.employeeId, employeeId),
      eq(employeeDocuments.isArchived, false),
    ))
    .orderBy(desc(employeeDocuments.createdAt));
}

export async function createEmployeeDocument(accountId: string, input: {
  employeeId: string;
  name: string;
  type: string;
  storagePath: string;
  mimeType?: string | null;
  size?: number | null;
  expiresAt?: string | null;
  notes?: string | null;
  uploadedBy: string;
}) {
  const now = new Date();
  const [created] = await db
    .insert(employeeDocuments)
    .values({
      accountId,
      employeeId: input.employeeId,
      name: input.name,
      type: input.type || 'other',
      storagePath: input.storagePath,
      mimeType: input.mimeType ?? null,
      size: input.size ?? null,
      expiresAt: input.expiresAt ?? null,
      notes: input.notes ?? null,
      uploadedBy: input.uploadedBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function deleteEmployeeDocument(accountId: string, docId: string) {
  const now = new Date();
  const [updated] = await db
    .update(employeeDocuments)
    .set({ isArchived: true, updatedAt: now })
    .where(and(eq(employeeDocuments.id, docId), eq(employeeDocuments.accountId, accountId)))
    .returning();

  return updated || null;
}

export async function getEmployeeDocument(accountId: string, docId: string) {
  const [doc] = await db
    .select()
    .from(employeeDocuments)
    .where(and(eq(employeeDocuments.id, docId), eq(employeeDocuments.accountId, accountId)))
    .limit(1);

  return doc || null;
}

// ─── Seed Sample Data ───────────────────────────────────────────────

export async function seedSampleData(userId: string, accountId: string) {
  // Idempotency guard — skip if data already exists
  const existing = await db.select({ id: employees.id }).from(employees)
    .where(eq(employees.userId, userId)).limit(1);
  if (existing.length > 0) return { skipped: true };

  // Create 3 departments
  const engineering = await createDepartment(userId, accountId, { name: 'Engineering', color: '#3b82f6' });
  const marketing = await createDepartment(userId, accountId, { name: 'Marketing', color: '#f59e0b' });
  const operations = await createDepartment(userId, accountId, { name: 'Operations', color: '#10b981' });

  const today = new Date().toISOString().split('T')[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
  const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
  const twoYearsAgo = new Date(Date.now() - 730 * 86400000).toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const inThreeWeeks = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];

  // Create 8 employees
  const emp1 = await createEmployee(userId, accountId, { name: 'Alice Johnson', email: 'alice@company.com', role: 'Senior Engineer', departmentId: engineering.id, startDate: twoYearsAgo, phone: '+1-555-0101' });
  const emp2 = await createEmployee(userId, accountId, { name: 'Bob Williams', email: 'bob@company.com', role: 'Marketing Lead', departmentId: marketing.id, startDate: oneYearAgo, phone: '+1-555-0102' });
  const emp3 = await createEmployee(userId, accountId, { name: 'Carol Davis', email: 'carol@company.com', role: 'Frontend Developer', departmentId: engineering.id, startDate: sixMonthsAgo });
  const emp4 = await createEmployee(userId, accountId, { name: 'David Brown', email: 'david@company.com', role: 'Operations Manager', departmentId: operations.id, startDate: twoYearsAgo, phone: '+1-555-0104' });
  const emp5 = await createEmployee(userId, accountId, { name: 'Eva Martinez', email: 'eva@company.com', role: 'Content Strategist', departmentId: marketing.id, startDate: oneYearAgo });
  const emp6 = await createEmployee(userId, accountId, { name: 'Frank Lee', email: 'frank@company.com', role: 'DevOps Engineer', departmentId: engineering.id, startDate: sixMonthsAgo, status: 'on-leave' });
  const emp7 = await createEmployee(userId, accountId, { name: 'Grace Kim', email: 'grace@company.com', role: 'HR Coordinator', departmentId: operations.id, startDate: oneYearAgo, phone: '+1-555-0107' });
  const emp8 = await createEmployee(userId, accountId, { name: 'Henry Wilson', email: 'henry@company.com', role: 'Backend Developer', departmentId: engineering.id, startDate: twoYearsAgo });

  // Set department heads
  await updateDepartment(userId, accountId, engineering.id, { headEmployeeId: emp1.id });
  await updateDepartment(userId, accountId, marketing.id, { headEmployeeId: emp2.id });
  await updateDepartment(userId, accountId, operations.id, { headEmployeeId: emp4.id });

  // Create 5 time-off requests
  await createTimeOffRequest(userId, accountId, { employeeId: emp1.id, type: 'vacation', startDate: nextWeek, endDate: inTwoWeeks, notes: 'Family vacation' });
  await createTimeOffRequest(userId, accountId, { employeeId: emp3.id, type: 'sick', startDate: today, endDate: today, notes: 'Not feeling well' });
  await createTimeOffRequest(userId, accountId, { employeeId: emp5.id, type: 'personal', startDate: inTwoWeeks, endDate: inTwoWeeks });
  await createTimeOffRequest(userId, accountId, { employeeId: emp6.id, type: 'sick', startDate: today, endDate: nextWeek, notes: 'Medical recovery' });
  await createTimeOffRequest(userId, accountId, { employeeId: emp8.id, type: 'vacation', startDate: inTwoWeeks, endDate: inThreeWeeks, notes: 'Travel abroad' });

  logger.info({ userId, accountId }, 'Seeded HR sample data');
  return { departments: 3, employees: 8, timeOffRequests: 5 };
}
