import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DrawExportQuality = 1 | 2 | 4;
export type DrawBackground = 'white' | 'light' | 'dark';
export type DrawAutoSaveInterval = 1000 | 2000 | 5000 | 10000;
export type DrawSortOrder = 'name' | 'created' | 'modified';

interface DrawSettingsState {
  // Canvas
  gridMode: boolean;
  snapToGrid: boolean;
  defaultBackground: DrawBackground;

  // Export
  exportQuality: DrawExportQuality;
  exportWithBackground: boolean;

  // Behavior
  autoSaveInterval: DrawAutoSaveInterval;
  sortOrder: DrawSortOrder;

  // Setters
  setGridMode: (value: boolean) => void;
  setSnapToGrid: (value: boolean) => void;
  setDefaultBackground: (value: DrawBackground) => void;
  setExportQuality: (value: DrawExportQuality) => void;
  setExportWithBackground: (value: boolean) => void;
  setAutoSaveInterval: (value: DrawAutoSaveInterval) => void;
  setSortOrder: (value: DrawSortOrder) => void;
}

export const useDrawSettingsStore = create<DrawSettingsState>()(
  persist(
    (set) => ({
      gridMode: false,
      snapToGrid: false,
      defaultBackground: 'white',
      exportQuality: 1,
      exportWithBackground: true,
      autoSaveInterval: 2000,
      sortOrder: 'modified',

      setGridMode: (gridMode) => set({ gridMode }),
      setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
      setDefaultBackground: (defaultBackground) => set({ defaultBackground }),
      setExportQuality: (exportQuality) => set({ exportQuality }),
      setExportWithBackground: (exportWithBackground) => set({ exportWithBackground }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
    }),
    { name: 'atlasmail-draw-settings' },
  ),
);
