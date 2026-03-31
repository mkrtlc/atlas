import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock projects service
vi.mock('../src/apps/projects/service', () => ({
  listProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  listClients: vi.fn(),
  getClient: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  regeneratePortalToken: vi.fn(),
  listProjectMembers: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
  updateProjectMemberRate: vi.fn(),
  listTimeEntries: vi.fn(),
  getTimeEntry: vi.fn(),
  createTimeEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
  bulkLockEntries: vi.fn(),
  getWeeklyView: vi.fn(),
  listInvoices: vi.fn(),
  getInvoice: vi.fn(),
  createInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  deleteInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  markInvoicePaid: vi.fn(),
  getWidgetData: vi.fn(),
  getDashboardData: vi.fn(),
}));

// Mock event service
vi.mock('../src/services/event.service', () => ({
  emitAppEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as controller from '../src/apps/projects/controller';
import * as projectService from '../src/apps/projects/service';

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

// ─── Projects ──────────────────────────────────────────────────────

describe('projects controller — listProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns projects list with success:true', async () => {
    const mockProjects = [
      { id: 'p1', name: 'Website Redesign' },
      { id: 'p2', name: 'Mobile App' },
    ];
    vi.mocked(projectService.listProjects).mockResolvedValue(mockProjects as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listProjects(req, res);

    expect(projectService.listProjects).toHaveBeenCalledWith('u1', 'a1', {
      search: undefined,
      clientId: undefined,
      status: undefined,
      includeArchived: false,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { projects: mockProjects } })
    );
  });

  it('passes query filters to service', async () => {
    vi.mocked(projectService.listProjects).mockResolvedValue([] as any);

    const req = makeReq({ query: { search: 'web', clientId: 'c1', status: 'active', includeArchived: 'true' } });
    const res = makeRes();

    await controller.listProjects(req, res);

    expect(projectService.listProjects).toHaveBeenCalledWith('u1', 'a1', {
      search: 'web',
      clientId: 'c1',
      status: 'active',
      includeArchived: true,
    });
  });
});

describe('projects controller — createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();

    await controller.createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Name is required' })
    );
  });

  it('returns 400 when name is whitespace only', async () => {
    const req = makeReq({ body: { name: '   ' } });
    const res = makeRes();

    await controller.createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a project and returns it', async () => {
    const mockProject = { id: 'p1', name: 'New Project', status: 'active' };
    vi.mocked(projectService.createProject).mockResolvedValue(mockProject as any);

    const req = makeReq({
      body: { name: 'New Project', clientId: 'c1', billable: true, status: 'active' },
    });
    const res = makeRes();

    await controller.createProject(req, res);

    expect(projectService.createProject).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      name: 'New Project',
      clientId: 'c1',
      billable: true,
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockProject })
    );
  });

  it('returns 500 when service throws', async () => {
    vi.mocked(projectService.createProject).mockRejectedValue(new Error('DB failure'));

    const req = makeReq({ body: { name: 'Failing Project' } });
    const res = makeRes();

    await controller.createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── Clients ───────────────────────────────────────────────────────

describe('projects controller — listClients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns clients list with success:true', async () => {
    const mockClients = [
      { id: 'c1', name: 'Acme Corp' },
      { id: 'c2', name: 'Globex Inc' },
    ];
    vi.mocked(projectService.listClients).mockResolvedValue(mockClients as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listClients(req, res);

    expect(projectService.listClients).toHaveBeenCalledWith('u1', 'a1', {
      search: undefined,
      includeArchived: false,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { clients: mockClients } })
    );
  });
});

describe('projects controller — createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const req = makeReq({ body: { email: 'client@test.com' } });
    const res = makeRes();

    await controller.createClient(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Name is required' })
    );
  });

  it('creates a client with all provided fields', async () => {
    const mockClient = { id: 'c1', name: 'New Client', email: 'client@test.com' };
    vi.mocked(projectService.createClient).mockResolvedValue(mockClient as any);

    const req = makeReq({
      body: { name: 'New Client', email: 'client@test.com', phone: '+1234567890', currency: 'USD' },
    });
    const res = makeRes();

    await controller.createClient(req, res);

    expect(projectService.createClient).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      name: 'New Client',
      email: 'client@test.com',
      phone: '+1234567890',
      currency: 'USD',
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockClient })
    );
  });
});

// ─── Invoices ──────────────────────────────────────────────────────

describe('projects controller — listInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invoices with query filters', async () => {
    const mockInvoices = [{ id: 'inv-1', invoiceNumber: 'INV-001', amount: 5000 }];
    vi.mocked(projectService.listInvoices).mockResolvedValue(mockInvoices as any);

    const req = makeReq({ query: { clientId: 'c1', status: 'sent' } });
    const res = makeRes();

    await controller.listInvoices(req, res);

    expect(projectService.listInvoices).toHaveBeenCalledWith('u1', 'a1', {
      clientId: 'c1',
      status: 'sent',
      search: undefined,
      includeArchived: false,
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { invoices: mockInvoices } })
    );
  });
});

describe('projects controller — createInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when clientId is missing', async () => {
    const req = makeReq({ body: { amount: 1000 } });
    const res = makeRes();

    await controller.createInvoice(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'clientId is required' })
    );
  });

  it('creates an invoice when clientId is provided', async () => {
    const mockInvoice = { id: 'inv-1', clientId: 'c1', invoiceNumber: 'INV-001', amount: 2500 };
    vi.mocked(projectService.createInvoice).mockResolvedValue(mockInvoice as any);

    const req = makeReq({
      body: { clientId: 'c1', invoiceNumber: 'INV-001', amount: 2500, currency: 'EUR', status: 'draft' },
    });
    const res = makeRes();

    await controller.createInvoice(req, res);

    expect(projectService.createInvoice).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      clientId: 'c1',
      invoiceNumber: 'INV-001',
      amount: 2500,
      currency: 'EUR',
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockInvoice })
    );
  });
});

// ─── Time Entries ──────────────────────────────────────────────────

describe('projects controller — createTimeEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when projectId is missing', async () => {
    const req = makeReq({ body: { workDate: '2026-03-30' } });
    const res = makeRes();

    await controller.createTimeEntry(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'projectId and workDate are required' })
    );
  });

  it('returns 400 when workDate is missing', async () => {
    const req = makeReq({ body: { projectId: 'p1' } });
    const res = makeRes();

    await controller.createTimeEntry(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a time entry with valid data', async () => {
    const mockEntry = { id: 'te-1', projectId: 'p1', durationMinutes: 120, workDate: '2026-03-30' };
    vi.mocked(projectService.createTimeEntry).mockResolvedValue(mockEntry as any);

    const req = makeReq({
      body: { projectId: 'p1', durationMinutes: 120, workDate: '2026-03-30', billable: true, notes: 'Frontend work' },
    });
    const res = makeRes();

    await controller.createTimeEntry(req, res);

    expect(projectService.createTimeEntry).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      projectId: 'p1',
      durationMinutes: 120,
      workDate: '2026-03-30',
      billable: true,
      notes: 'Frontend work',
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockEntry })
    );
  });

  it('defaults durationMinutes to 0 when not provided', async () => {
    const mockEntry = { id: 'te-2', projectId: 'p1', durationMinutes: 0, workDate: '2026-03-30' };
    vi.mocked(projectService.createTimeEntry).mockResolvedValue(mockEntry as any);

    const req = makeReq({
      body: { projectId: 'p1', workDate: '2026-03-30' },
    });
    const res = makeRes();

    await controller.createTimeEntry(req, res);

    expect(projectService.createTimeEntry).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      durationMinutes: 0,
    }));
  });
});
