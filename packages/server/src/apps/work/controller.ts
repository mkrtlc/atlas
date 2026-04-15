import type { Request, Response } from 'express';

const NOT_IMPLEMENTED = (_req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const listTasks = NOT_IMPLEMENTED;
export const createTask = NOT_IMPLEMENTED;
export const searchTasks = NOT_IMPLEMENTED;
export const getTaskCounts = NOT_IMPLEMENTED;
export const getTask = NOT_IMPLEMENTED;
export const updateTask = NOT_IMPLEMENTED;
export const deleteTask = NOT_IMPLEMENTED;

export const listProjects = NOT_IMPLEMENTED;
export const createProject = NOT_IMPLEMENTED;
export const getProject = NOT_IMPLEMENTED;
export const updateProject = NOT_IMPLEMENTED;
export const deleteProject = NOT_IMPLEMENTED;

export const listProjectMembers = NOT_IMPLEMENTED;
export const addProjectMember = NOT_IMPLEMENTED;
export const removeProjectMember = NOT_IMPLEMENTED;

export const listProjectTimeEntries = NOT_IMPLEMENTED;
export const createProjectTimeEntry = NOT_IMPLEMENTED;
export const updateProjectTimeEntry = NOT_IMPLEMENTED;
export const deleteProjectTimeEntry = NOT_IMPLEMENTED;

export const listProjectFiles = NOT_IMPLEMENTED;
export const getProjectFinancials = NOT_IMPLEMENTED;
