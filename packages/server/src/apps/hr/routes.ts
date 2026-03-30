import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as hrController from './controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();
router.use(authMiddleware);

// File upload config for employee documents
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../../uploads/hr'),
  filename: (_req, file, cb) => {
    const userId = (_req as any).auth?.userId || 'anon';
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${userId}_${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Dashboard
router.get('/dashboard', hrController.getDashboard);

// Departments (before /:id to avoid route conflicts)
router.get('/departments/list', hrController.listDepartments);
router.post('/departments', hrController.createDepartment);
router.patch('/departments/:id', hrController.updateDepartment);
router.delete('/departments/:id', hrController.deleteDepartment);

// Time Off (before /:id to avoid route conflicts)
router.get('/time-off/list', hrController.listTimeOffRequests);
router.post('/time-off', hrController.createTimeOffRequest);
router.patch('/time-off/:id', hrController.updateTimeOffRequest);
router.delete('/time-off/:id', hrController.deleteTimeOffRequest);

// Leave balances summary (before /:id)
router.get('/leave-balances/summary', hrController.getLeaveBalancesSummary);

// Onboarding templates (before /:id)
router.get('/onboarding-templates', hrController.listOnboardingTemplates);
router.post('/onboarding-templates', hrController.createOnboardingTemplate);

// Onboarding task updates (before /:id)
router.patch('/onboarding/:taskId', hrController.updateOnboardingTask);
router.delete('/onboarding/:taskId', hrController.deleteOnboardingTask);

// Employee documents (before /:id)
router.delete('/documents/:docId', hrController.deleteEmployeeDocument);
router.get('/documents/:docId/download', hrController.downloadEmployeeDocument);

// Employees
router.get('/', hrController.listEmployees);
router.post('/', hrController.createEmployee);
router.get('/search', hrController.searchEmployees);
router.get('/counts', hrController.getEmployeeCounts);
router.get('/:id', hrController.getEmployee);
router.patch('/:id', hrController.updateEmployee);
router.delete('/:id', hrController.deleteEmployee);

// Employee leave balances
router.get('/:id/leave-balances', hrController.getLeaveBalances);
router.post('/:id/leave-balances', hrController.allocateLeave);

// Employee onboarding
router.get('/:id/onboarding', hrController.listOnboardingTasks);
router.post('/:id/onboarding', hrController.createOnboardingTask);
router.post('/:id/onboarding/from-template', hrController.createTasksFromTemplate);

// Employee documents
router.get('/:id/documents', hrController.listEmployeeDocuments);
router.post('/:id/documents', upload.single('file'), hrController.uploadEmployeeDocument);

// Seed sample data
router.post('/seed', hrController.seedSampleData);

export default router;
