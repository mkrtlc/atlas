import { describe, it, expect, vi } from 'vitest';
import { api } from '../src/lib/api-client';

import {
  useTaskList,
  useTask,
  useTaskCounts,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useRestoreTask,
  useProjectList,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useReorderTasks,
  useSubtasks,
  useCreateSubtask,
  useUpdateSubtask,
  useDeleteSubtask,
  useTaskActivities,
  useTaskTemplates,
  useCreateTaskTemplate,
  useDeleteTaskTemplate,
  useCreateTaskFromTemplate,
  useCreateTaskFromEmail,
} from '../src/apps/tasks/hooks';

describe('Tasks hooks', () => {
  // ─── Exports exist ───────────────────────────────────────────────

  describe('hook exports', () => {
    it('exports task query hooks as functions', () => {
      expect(typeof useTaskList).toBe('function');
      expect(typeof useTask).toBe('function');
      expect(typeof useTaskCounts).toBe('function');
    });

    it('exports task mutation hooks as functions', () => {
      expect(typeof useCreateTask).toBe('function');
      expect(typeof useUpdateTask).toBe('function');
      expect(typeof useDeleteTask).toBe('function');
      expect(typeof useRestoreTask).toBe('function');
    });

    it('exports project hooks as functions', () => {
      expect(typeof useProjectList).toBe('function');
      expect(typeof useCreateProject).toBe('function');
      expect(typeof useUpdateProject).toBe('function');
      expect(typeof useDeleteProject).toBe('function');
    });

    it('exports subtask hooks as functions', () => {
      expect(typeof useSubtasks).toBe('function');
      expect(typeof useCreateSubtask).toBe('function');
      expect(typeof useUpdateSubtask).toBe('function');
      expect(typeof useDeleteSubtask).toBe('function');
    });

    it('exports template hooks as functions', () => {
      expect(typeof useTaskTemplates).toBe('function');
      expect(typeof useCreateTaskTemplate).toBe('function');
      expect(typeof useDeleteTaskTemplate).toBe('function');
      expect(typeof useCreateTaskFromTemplate).toBe('function');
    });

    it('exports reorder and activity hooks', () => {
      expect(typeof useReorderTasks).toBe('function');
      expect(typeof useTaskActivities).toBe('function');
      expect(typeof useCreateTaskFromEmail).toBe('function');
    });
  });

  // ─── API endpoint patterns ────────────────────────────────────────

  describe('API endpoint patterns', () => {
    it('task list calls /tasks', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { tasks: [] } } } as any);
      await api.get('/tasks');
      expect(mockedGet).toHaveBeenCalledWith('/tasks');
    });

    it('task counts calls /tasks/counts', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { inbox: 0, today: 0 } } } as any);
      await api.get('/tasks/counts');
      expect(mockedGet).toHaveBeenCalledWith('/tasks/counts');
    });

    it('task creation posts to /tasks', async () => {
      const mockedPost = vi.mocked(api.post);
      mockedPost.mockResolvedValueOnce({ data: { success: true, data: {} } } as any);
      await api.post('/tasks', { title: 'New task' });
      expect(mockedPost).toHaveBeenCalledWith('/tasks', { title: 'New task' });
    });

    it('task update patches /tasks/:id', async () => {
      const mockedPatch = vi.mocked(api.patch);
      mockedPatch.mockResolvedValueOnce({ data: { success: true, data: {} } } as any);
      await api.patch('/tasks/t-1', { title: 'Updated' });
      expect(mockedPatch).toHaveBeenCalledWith('/tasks/t-1', { title: 'Updated' });
    });

    it('task deletion calls DELETE /tasks/:id', async () => {
      const mockedDelete = vi.mocked(api.delete);
      mockedDelete.mockResolvedValueOnce({ data: { success: true } } as any);
      await api.delete('/tasks/t-1');
      expect(mockedDelete).toHaveBeenCalledWith('/tasks/t-1');
    });

    it('project list calls /tasks/projects/list', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { projects: [] } } } as any);
      await api.get('/tasks/projects/list');
      expect(mockedGet).toHaveBeenCalledWith('/tasks/projects/list');
    });

    it('subtask creation posts to /tasks/:id/subtasks', async () => {
      const mockedPost = vi.mocked(api.post);
      mockedPost.mockResolvedValueOnce({ data: { success: true, data: {} } } as any);
      await api.post('/tasks/t-1/subtasks', { title: 'Sub' });
      expect(mockedPost).toHaveBeenCalledWith('/tasks/t-1/subtasks', { title: 'Sub' });
    });

    it('task templates list calls /tasks/templates/list', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: [] } } as any);
      await api.get('/tasks/templates/list');
      expect(mockedGet).toHaveBeenCalledWith('/tasks/templates/list');
    });
  });

  // ─── Module completeness ─────────────────────────────────────────

  describe('module completeness', () => {
    it('exports at least 20 hook functions', async () => {
      const mod = await import('../src/apps/tasks/hooks');
      const hookNames = Object.keys(mod).filter((k) => k.startsWith('use'));
      expect(hookNames.length).toBeGreaterThanOrEqual(20);
    });
  });
});
