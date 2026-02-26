import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskDefaultView = 'inbox' | 'today' | 'anytime';
export type TaskCompletedBehavior = 'fade' | 'move' | 'hide';
export type TaskSortOrder = 'manual' | 'priority' | 'dueDate' | 'title' | 'created';

interface TasksSettingsState {
  // General
  defaultView: TaskDefaultView;
  confirmBeforeDelete: boolean;

  // Today view
  showCalendarInToday: boolean;
  showEveningSection: boolean;

  // Appearance
  showWhenBadges: boolean;
  showProjectInList: boolean;
  showNotesIndicator: boolean;
  compactMode: boolean;

  // Behavior
  completedBehavior: TaskCompletedBehavior;
  defaultSortOrder: TaskSortOrder;

  // Setters
  setDefaultView: (value: TaskDefaultView) => void;
  setConfirmBeforeDelete: (value: boolean) => void;
  setShowCalendarInToday: (value: boolean) => void;
  setShowEveningSection: (value: boolean) => void;
  setShowWhenBadges: (value: boolean) => void;
  setShowProjectInList: (value: boolean) => void;
  setShowNotesIndicator: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  setCompletedBehavior: (value: TaskCompletedBehavior) => void;
  setDefaultSortOrder: (value: TaskSortOrder) => void;
}

export const useTasksSettingsStore = create<TasksSettingsState>()(
  persist(
    (set) => ({
      defaultView: 'inbox',
      confirmBeforeDelete: true,
      showCalendarInToday: true,
      showEveningSection: true,
      showWhenBadges: true,
      showProjectInList: true,
      showNotesIndicator: true,
      compactMode: false,
      completedBehavior: 'fade',
      defaultSortOrder: 'manual',

      setDefaultView: (defaultView) => set({ defaultView }),
      setConfirmBeforeDelete: (confirmBeforeDelete) => set({ confirmBeforeDelete }),
      setShowCalendarInToday: (showCalendarInToday) => set({ showCalendarInToday }),
      setShowEveningSection: (showEveningSection) => set({ showEveningSection }),
      setShowWhenBadges: (showWhenBadges) => set({ showWhenBadges }),
      setShowProjectInList: (showProjectInList) => set({ showProjectInList }),
      setShowNotesIndicator: (showNotesIndicator) => set({ showNotesIndicator }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setCompletedBehavior: (completedBehavior) => set({ completedBehavior }),
      setDefaultSortOrder: (defaultSortOrder) => set({ defaultSortOrder }),
    }),
    { name: 'atlasmail-tasks-settings' },
  ),
);
