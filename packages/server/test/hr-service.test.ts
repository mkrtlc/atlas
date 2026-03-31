import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock HR service
vi.mock('../src/apps/hr/service', () => ({
  listEmployees: vi.fn(),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
  searchEmployees: vi.fn(),
  getEmployeeCounts: vi.fn(),
  listDepartments: vi.fn(),
  getDepartment: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  deleteDepartment: vi.fn(),
  getWidgetData: vi.fn(),
  getDashboardData: vi.fn(),
}));

// Mock leave service
vi.mock('../src/apps/hr/leave.service', () => ({}));

// Mock attendance service
vi.mock('../src/apps/hr/attendance.service', () => ({}));

// Mock event service
vi.mock('../src/services/event.service', () => ({
  emitAppEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as controller from '../src/apps/hr/controller';
import * as hrService from '../src/apps/hr/service';

function makeReq(overrides: Record<string, any> = {}): Request {
  return {
    auth: { userId: 'u1', accountId: 'a1', email: 'test@test.com', tenantId: 't1' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

// ─── Employees ─────────────────────────────────────────────────────

describe('hr controller — listEmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns employees list with success', async () => {
    const mockEmployees = [
      { id: 'e1', name: 'Alice', email: 'alice@company.com' },
      { id: 'e2', name: 'Bob', email: 'bob@company.com' },
    ];
    vi.mocked(hrService.listEmployees).mockResolvedValue(mockEmployees as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listEmployees(req, res);

    expect(hrService.listEmployees).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({}));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { employees: mockEmployees } })
    );
  });

  it('passes filter parameters from query', async () => {
    vi.mocked(hrService.listEmployees).mockResolvedValue([] as any);

    const req = makeReq({ query: { status: 'active', departmentId: 'dept-1' } });
    const res = makeRes();

    await controller.listEmployees(req, res);

    expect(hrService.listEmployees).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      status: 'active',
      departmentId: 'dept-1',
    }));
  });
});

describe('hr controller — getEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns employee when found', async () => {
    const mockEmployee = { id: 'e1', name: 'Alice' };
    vi.mocked(hrService.getEmployee).mockResolvedValue(mockEmployee as any);

    const req = makeReq({ params: { id: 'e1' } });
    const res = makeRes();

    await controller.getEmployee(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockEmployee })
    );
  });

  it('returns 404 when employee is not found', async () => {
    vi.mocked(hrService.getEmployee).mockResolvedValue(null as any);

    const req = makeReq({ params: { id: 'nonexistent' } });
    const res = makeRes();

    await controller.getEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Employee not found' })
    );
  });
});

describe('hr controller — createEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an employee and returns it', async () => {
    const mockEmployee = { id: 'e1', name: 'Alice', email: 'alice@company.com' };
    vi.mocked(hrService.createEmployee).mockResolvedValue(mockEmployee as any);

    const req = makeReq({
      body: { name: 'Alice', email: 'alice@company.com', role: 'Engineer' },
    });
    const res = makeRes();

    await controller.createEmployee(req, res);

    expect(hrService.createEmployee).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      name: 'Alice',
      email: 'alice@company.com',
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockEmployee })
    );
  });

  it('returns 400 when name is missing', async () => {
    const req = makeReq({ body: { email: 'alice@company.com' } });
    const res = makeRes();

    await controller.createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Name is required' })
    );
  });

  it('returns 400 when email is missing', async () => {
    const req = makeReq({ body: { name: 'Alice' } });
    const res = makeRes();

    await controller.createEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Email is required' })
    );
  });
});

describe('hr controller — updateEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates an employee and returns it', async () => {
    const updated = { id: 'e1', name: 'Alice Smith', email: 'alice@company.com' };
    vi.mocked(hrService.updateEmployee).mockResolvedValue(updated as any);

    const req = makeReq({ params: { id: 'e1' }, body: { name: 'Alice Smith' } });
    const res = makeRes();

    await controller.updateEmployee(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: updated })
    );
  });

  it('returns 404 when employee to update is not found', async () => {
    vi.mocked(hrService.updateEmployee).mockResolvedValue(null as any);

    const req = makeReq({ params: { id: 'missing' }, body: { name: 'X' } });
    const res = makeRes();

    await controller.updateEmployee(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Employee not found' })
    );
  });
});

describe('hr controller — deleteEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes an employee and returns success', async () => {
    vi.mocked(hrService.deleteEmployee).mockResolvedValue(undefined as any);

    const req = makeReq({ params: { id: 'e1' } });
    const res = makeRes();

    await controller.deleteEmployee(req, res);

    expect(hrService.deleteEmployee).toHaveBeenCalledWith('u1', 'e1');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: null })
    );
  });
});

// ─── Departments ───────────────────────────────────────────────────

describe('hr controller — listDepartments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns departments list', async () => {
    const mockDepts = [
      { id: 'dept-1', name: 'Engineering' },
      { id: 'dept-2', name: 'Design' },
    ];
    vi.mocked(hrService.listDepartments).mockResolvedValue(mockDepts as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listDepartments(req, res);

    expect(hrService.listDepartments).toHaveBeenCalledWith('u1', 'a1', false);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { departments: mockDepts } })
    );
  });

  it('passes includeArchived flag', async () => {
    vi.mocked(hrService.listDepartments).mockResolvedValue([] as any);

    const req = makeReq({ query: { includeArchived: 'true' } });
    const res = makeRes();

    await controller.listDepartments(req, res);

    expect(hrService.listDepartments).toHaveBeenCalledWith('u1', 'a1', true);
  });
});

describe('hr controller — createDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a department and returns it', async () => {
    const mockDept = { id: 'dept-1', name: 'Marketing' };
    vi.mocked(hrService.createDepartment).mockResolvedValue(mockDept as any);

    const req = makeReq({ body: { name: 'Marketing' } });
    const res = makeRes();

    await controller.createDepartment(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockDept })
    );
  });

  it('returns 400 when department name is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();

    await controller.createDepartment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Name is required' })
    );
  });
});

describe('hr controller — deleteDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a department and returns success', async () => {
    vi.mocked(hrService.deleteDepartment).mockResolvedValue(undefined as any);

    const req = makeReq({ params: { id: 'dept-1' } });
    const res = makeRes();

    await controller.deleteDepartment(req, res);

    expect(hrService.deleteDepartment).toHaveBeenCalledWith('u1', 'a1', 'dept-1');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: null })
    );
  });
});
