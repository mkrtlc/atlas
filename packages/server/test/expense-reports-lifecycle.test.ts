import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/apps/hr/services/expense-report.service', () => ({
  listExpenseReports: vi.fn().mockResolvedValue([]),
  listMyExpenseReports: vi.fn().mockResolvedValue([]),
  getExpenseReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'draft' }),
  createExpenseReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'draft' }),
  updateExpenseReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'draft' }),
  deleteExpenseReport: vi.fn().mockResolvedValue({ id: 'r1' }),
  submitExpenseReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'submitted' }),
  approveExpenseReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'approved' }),
  refuseExpenseReport: vi.fn().mockResolvedValue({ id: 'r1', status: 'refused' }),
}));

vi.mock('../src/apps/hr/services/employee.service', () => ({
  findEmployeeIdByLinkedUser: vi.fn().mockResolvedValue('emp-self'),
}));

vi.mock('../src/apps/hr/services/expense.service', () => ({
  getExpense: vi.fn().mockResolvedValue({ id: 'exp-1', userId: 'u-self', reportId: null }),
  updateExpense: vi.fn().mockResolvedValue({ id: 'exp-1', reportId: 'r1' }),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../src/services/event.service', () => ({
  emitAppEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as reportController from '../src/apps/hr/controllers/expense-report.controller';
import * as expenseController from '../src/apps/hr/controllers/expense.controller';
import * as reportService from '../src/apps/hr/services/expense-report.service';
import * as expenseService from '../src/apps/hr/services/expense.service';
import * as employeeService from '../src/apps/hr/services/employee.service';
import {
  makeReqWithPerm,
  makeRes,
  expectForbidden,
  expectSuccess,
  expectNotFound,
  SELF_USER_ID,
} from './helpers/rbac-harness';

function req(role: 'admin' | 'editor' | 'viewer', extra: any = {}) {
  return makeReqWithPerm('hr', role, 'all', extra);
}

describe('Expense report lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(employeeService.findEmployeeIdByLinkedUser).mockResolvedValue('emp-self');
  });

  // ─── Delete ────────────────────────────────────────────────────

  describe('deleteExpenseReport', () => {
    it('viewer cannot delete', async () => {
      const res = makeRes();
      await reportController.deleteExpenseReport(
        req('viewer', { params: { id: 'r1' } }),
        res,
      );
      expectForbidden(res);
    });

    it('editor can delete (delete_own)', async () => {
      const res = makeRes();
      await reportController.deleteExpenseReport(
        req('editor', { params: { id: 'r1' } }),
        res,
      );
      expectSuccess(res);
      expect(reportService.deleteExpenseReport).toHaveBeenCalledWith('t1', 'r1');
    });

    it('admin can delete', async () => {
      const res = makeRes();
      await reportController.deleteExpenseReport(
        req('admin', { params: { id: 'r1' } }),
        res,
      );
      expectSuccess(res);
    });

    it('returns 404 when service returns null', async () => {
      vi.mocked(reportService.deleteExpenseReport).mockResolvedValueOnce(null as any);
      const res = makeRes();
      await reportController.deleteExpenseReport(
        req('admin', { params: { id: 'r1' } }),
        res,
      );
      expectNotFound(res);
    });
  });

  // ─── Approve ───────────────────────────────────────────────────

  describe('approveExpenseReport', () => {
    it('viewer cannot approve', async () => {
      const res = makeRes();
      await reportController.approveExpenseReport(
        req('viewer', { params: { id: 'r1' } }),
        res,
      );
      expectForbidden(res);
    });

    it('editor can approve and approver id is resolved from the caller', async () => {
      const res = makeRes();
      await reportController.approveExpenseReport(
        req('editor', { params: { id: 'r1' } }),
        res,
      );
      expectSuccess(res);
      expect(employeeService.findEmployeeIdByLinkedUser).toHaveBeenCalledWith(SELF_USER_ID, 't1');
      expect(reportService.approveExpenseReport).toHaveBeenCalledWith('t1', 'r1', 'emp-self');
    });

    it('admin can approve', async () => {
      const res = makeRes();
      await reportController.approveExpenseReport(
        req('admin', { params: { id: 'r1' } }),
        res,
      );
      expectSuccess(res);
    });

    it('returns 400 when caller has no linked employee profile', async () => {
      vi.mocked(employeeService.findEmployeeIdByLinkedUser).mockResolvedValueOnce(null);
      const res = makeRes();
      await reportController.approveExpenseReport(
        req('admin', { params: { id: 'r1' } }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when the report is not approvable', async () => {
      vi.mocked(reportService.approveExpenseReport).mockResolvedValueOnce(null as any);
      const res = makeRes();
      await reportController.approveExpenseReport(
        req('admin', { params: { id: 'r1' } }),
        res,
      );
      expectNotFound(res);
    });
  });

  // ─── Refuse ────────────────────────────────────────────────────

  describe('refuseExpenseReport', () => {
    it('viewer cannot refuse', async () => {
      const res = makeRes();
      await reportController.refuseExpenseReport(
        req('viewer', { params: { id: 'r1' }, body: { comment: 'no' } }),
        res,
      );
      expectForbidden(res);
    });

    it('editor can refuse with comment', async () => {
      const res = makeRes();
      await reportController.refuseExpenseReport(
        req('editor', { params: { id: 'r1' }, body: { comment: 'missing receipts' } }),
        res,
      );
      expectSuccess(res);
      expect(reportService.refuseExpenseReport).toHaveBeenCalledWith(
        't1',
        'r1',
        'emp-self',
        'missing receipts',
      );
    });

    it('admin can refuse without a comment', async () => {
      const res = makeRes();
      await reportController.refuseExpenseReport(
        req('admin', { params: { id: 'r1' }, body: {} }),
        res,
      );
      expectSuccess(res);
      expect(reportService.refuseExpenseReport).toHaveBeenCalledWith(
        't1',
        'r1',
        'emp-self',
        undefined,
      );
    });
  });

  // ─── Add / remove expense to report via updateExpense ────────

  describe('add / remove expense to report (via updateExpense)', () => {
    it('editor can attach an owned draft expense to a report', async () => {
      vi.mocked(expenseService.getExpense).mockResolvedValueOnce({
        id: 'exp-1',
        userId: SELF_USER_ID,
        reportId: null,
        status: 'draft',
      } as any);
      const res = makeRes();
      await expenseController.updateExpense(
        req('editor', { params: { id: 'exp-1' }, body: { reportId: 'r1' } }),
        res,
      );
      expectSuccess(res);
      expect(expenseService.updateExpense).toHaveBeenCalledWith(
        't1',
        'exp-1',
        expect.objectContaining({ reportId: 'r1' }),
      );
    });

    it('editor can detach an expense by setting reportId to null', async () => {
      vi.mocked(expenseService.getExpense).mockResolvedValueOnce({
        id: 'exp-1',
        userId: SELF_USER_ID,
        reportId: 'r1',
        status: 'draft',
      } as any);
      const res = makeRes();
      await expenseController.updateExpense(
        req('editor', { params: { id: 'exp-1' }, body: { reportId: null } }),
        res,
      );
      expectSuccess(res);
      expect(expenseService.updateExpense).toHaveBeenCalledWith(
        't1',
        'exp-1',
        expect.objectContaining({ reportId: null }),
      );
    });

    it('viewer cannot attach an expense to a report', async () => {
      const res = makeRes();
      await expenseController.updateExpense(
        req('viewer', { params: { id: 'exp-1' }, body: { reportId: 'r1' } }),
        res,
      );
      expectForbidden(res);
    });
  });
});
