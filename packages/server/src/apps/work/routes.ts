import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { requireAppPermission } from '../../middleware/require-app-permission';
import { withConcurrencyCheck } from '../../middleware/concurrency-check';
import { tasks, projectProjects } from '../../db/schema';
import * as controller from './controller';

const router = Router();

router.use(authMiddleware);
router.use(requireAppPermission('work'));

// Tasks
router.get('/tasks', controller.listTasks);
router.post('/tasks', controller.createTask);
router.get('/tasks/search', controller.searchTasks);
router.get('/tasks/counts', controller.getTaskCounts);
router.get('/tasks/:id', controller.getTask);
router.patch('/tasks/:id', withConcurrencyCheck(tasks), controller.updateTask);
router.delete('/tasks/:id', controller.deleteTask);

// Projects
router.get('/projects', controller.listProjects);
router.post('/projects', controller.createProject);
router.get('/projects/:id', controller.getProject);
router.patch('/projects/:id', withConcurrencyCheck(projectProjects), controller.updateProject);
router.delete('/projects/:id', controller.deleteProject);

// Project members
router.get('/projects/:id/members', controller.listProjectMembers);
router.post('/projects/:id/members', controller.addProjectMember);
router.delete('/projects/:id/members/:userId', controller.removeProjectMember);

// Project time entries
router.get('/projects/:id/time-entries', controller.listProjectTimeEntries);
router.post('/projects/:id/time-entries', controller.createProjectTimeEntry);
router.patch('/projects/:id/time-entries/:entryId', controller.updateProjectTimeEntry);
router.delete('/projects/:id/time-entries/:entryId', controller.deleteProjectTimeEntry);

// Project files and financials
router.get('/projects/:id/files', controller.listProjectFiles);
router.get('/projects/:id/financials', controller.getProjectFinancials);

export default router;
