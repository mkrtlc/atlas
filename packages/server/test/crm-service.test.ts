import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock CRM service
vi.mock('../src/apps/crm/service', () => ({
  listDeals: vi.fn(),
  getDeal: vi.fn(),
  createDeal: vi.fn(),
  updateDeal: vi.fn(),
  deleteDeal: vi.fn(),
  listContacts: vi.fn(),
  getContact: vi.fn(),
  createContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  listCompanies: vi.fn(),
  getCompany: vi.fn(),
  createCompany: vi.fn(),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn(),
  getWidgetData: vi.fn(),
  seedSampleData: vi.fn(),
  listDealStages: vi.fn(),
  seedDefaultStages: vi.fn(),
}));

// Mock CRM permissions
vi.mock('../src/apps/crm/permissions', () => ({
  getCrmPermission: vi.fn().mockResolvedValue({ role: 'admin', recordAccess: 'all' }),
  canAccess: vi.fn().mockReturnValue(true),
}));

// Mock event service
vi.mock('../src/services/event.service', () => ({
  emitAppEvent: vi.fn().mockResolvedValue(undefined),
  getTenantMemberUserIds: vi.fn().mockResolvedValue([]),
}));

// Mock google auth
vi.mock('../src/services/google-auth', () => ({
  isGoogleConfigured: vi.fn().mockReturnValue(false),
}));

// Mock redis
vi.mock('../src/config/redis', () => ({
  getRedisClient: vi.fn().mockReturnValue(null),
}));

// Mock workers
vi.mock('../src/workers', () => ({
  enqueueSyncJob: vi.fn(),
  SyncJobType: {},
}));

// Mock CRM email + calendar services
vi.mock('../src/apps/crm/email.service', () => ({}));
vi.mock('../src/apps/crm/calendar.service', () => ({}));

import * as controller from '../src/apps/crm/controller';
import * as crmService from '../src/apps/crm/service';
import * as crmPermissions from '../src/apps/crm/permissions';

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

// ─── Deals ─────────────────────────────────────────────────────────

describe('crm controller — listDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('returns deals list with success', async () => {
    const mockDeals = [
      { id: 'd1', title: 'Deal A', value: 1000 },
      { id: 'd2', title: 'Deal B', value: 2000 },
    ];
    vi.mocked(crmService.listDeals).mockResolvedValue(mockDeals as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listDeals(req, res);

    expect(crmService.listDeals).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      recordAccess: 'all',
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { deals: mockDeals } })
    );
  });

  it('returns 403 when user has no deals access', async () => {
    vi.mocked(crmPermissions.canAccess).mockReturnValue(false);

    const req = makeReq();
    const res = makeRes();

    await controller.listDeals(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'No access to deals' })
    );
  });
});

describe('crm controller — createDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('creates a deal and returns it', async () => {
    const mockDeal = { id: 'd1', title: 'New Deal', value: 5000 };
    vi.mocked(crmService.createDeal).mockResolvedValue(mockDeal as any);

    const req = makeReq({
      body: { title: 'New Deal', value: 5000, stageId: 'stage-1' },
    });
    const res = makeRes();

    await controller.createDeal(req, res);

    expect(crmService.createDeal).toHaveBeenCalledWith('u1', 'a1', expect.objectContaining({
      title: 'New Deal',
      value: 5000,
      stageId: 'stage-1',
    }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockDeal })
    );
  });

  it('returns 400 when title is missing', async () => {
    const req = makeReq({ body: { value: 1000, stageId: 'stage-1' } });
    const res = makeRes();

    await controller.createDeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Title is required' })
    );
  });

  it('returns 400 when stageId is missing', async () => {
    const req = makeReq({ body: { title: 'Deal' } });
    const res = makeRes();

    await controller.createDeal(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Stage is required' })
    );
  });
});

describe('crm controller — updateDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('updates a deal and returns it', async () => {
    const updatedDeal = { id: 'd1', title: 'Updated Deal', value: 7500 };
    vi.mocked(crmService.updateDeal).mockResolvedValue(updatedDeal as any);

    const req = makeReq({
      params: { id: 'd1' },
      body: { title: 'Updated Deal', value: 7500 },
    });
    const res = makeRes();

    await controller.updateDeal(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: updatedDeal })
    );
  });

  it('returns 404 when deal is not found', async () => {
    vi.mocked(crmService.updateDeal).mockResolvedValue(null as any);

    const req = makeReq({ params: { id: 'nonexistent' }, body: { title: 'X' } });
    const res = makeRes();

    await controller.updateDeal(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Deal not found' })
    );
  });
});

describe('crm controller — deleteDeal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('deletes a deal (soft delete) and returns success', async () => {
    vi.mocked(crmService.deleteDeal).mockResolvedValue(undefined as any);

    const req = makeReq({ params: { id: 'd1' } });
    const res = makeRes();

    await controller.deleteDeal(req, res);

    expect(crmService.deleteDeal).toHaveBeenCalledWith('u1', 'a1', 'd1', 'all');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: null })
    );
  });
});

// ─── Contacts ──────────────────────────────────────────────────────

describe('crm controller — listContacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('returns contacts list', async () => {
    const mockContacts = [{ id: 'c1', name: 'John Doe' }];
    vi.mocked(crmService.listContacts).mockResolvedValue(mockContacts as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listContacts(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { contacts: mockContacts } })
    );
  });
});

// ─── Companies ─────────────────────────────────────────────────────

describe('crm controller — listCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('returns companies list', async () => {
    const mockCompanies = [{ id: 'comp1', name: 'Acme Corp' }];
    vi.mocked(crmService.listCompanies).mockResolvedValue(mockCompanies as any);

    const req = makeReq({ query: {} });
    const res = makeRes();

    await controller.listCompanies(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { companies: mockCompanies } })
    );
  });

  it('returns 403 when user lacks company access', async () => {
    vi.mocked(crmPermissions.canAccess).mockReturnValue(false);

    const req = makeReq();
    const res = makeRes();

    await controller.listCompanies(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('crm controller — createCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(crmPermissions.getCrmPermission).mockResolvedValue({ role: 'admin', recordAccess: 'all' } as any);
    vi.mocked(crmPermissions.canAccess).mockReturnValue(true);
  });

  it('returns 400 when name is missing', async () => {
    const req = makeReq({ body: { domain: 'example.com' } });
    const res = makeRes();

    await controller.createCompany(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Name is required' })
    );
  });

  it('creates a company and returns it', async () => {
    const mockCompany = { id: 'comp1', name: 'Acme Corp' };
    vi.mocked(crmService.createCompany).mockResolvedValue(mockCompany as any);

    const req = makeReq({ body: { name: 'Acme Corp', domain: 'acme.com' } });
    const res = makeRes();

    await controller.createCompany(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockCompany })
    );
  });
});
