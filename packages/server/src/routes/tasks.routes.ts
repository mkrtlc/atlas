import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Tasks
router.get('/', taskController.listTasks);
router.post('/', taskController.createTask);
router.get('/search', taskController.searchTasks);
router.get('/counts', taskController.getTaskCounts);
router.patch('/reorder', taskController.reorderTasks);
router.get('/:id', taskController.getTask);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/restore', taskController.restoreTask);

// Seed sample data
router.post('/seed', taskController.seedSampleTasks);

// Projects
router.get('/projects/list', taskController.listProjects);
router.post('/projects', taskController.createProject);
router.patch('/projects/:id', taskController.updateProject);
router.delete('/projects/:id', taskController.deleteProject);

export default router;
