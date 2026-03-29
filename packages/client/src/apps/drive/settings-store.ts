import { create } from 'zustand';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';

export type DriveDefaultView = 'list' | 'grid';
export type DriveDefaultSort = 'default' | 'name' | 'size' | 'date' | 'type';
export type DriveSidebarDefault = 'files' | 'favourites' | 'recent';
export type DriveMaxVersions = 5 | 10 | 20 | 50;
export type DriveShareDefaultExpiry = 'never' | '1' | '7' | '30';
export type DriveDuplicateHandling = 'rename' | 'replace' | 'ask';
export type DriveSortOrder = 'asc' | 'desc';

interface DriveSettingsState {
  // View & layout
  defaultView: DriveDefaultView;
  defaultSort: DriveDefaultSort;
  sidebarDefault: DriveSidebarDefault;
  showPreviewPanel: boolean;
  compactMode: boolean;

  // File management
  confirmDelete: boolean;
  autoVersionOnReplace: boolean;
  maxVersions: DriveMaxVersions;
  shareDefaultExpiry: DriveShareDefaultExpiry;
  duplicateHandling: DriveDuplicateHandling;

  // Display
  showThumbnails: boolean;
  showFileExtensions: boolean;
  sortOrder: DriveSortOrder;

  _hydrated: boolean;

  // Setters
  setDefaultView: (value: DriveDefaultView) => void;
  setDefaultSort: (value: DriveDefaultSort) => void;
  setSidebarDefault: (value: DriveSidebarDefault) => void;
  setShowPreviewPanel: (value: boolean) => void;
  setCompactMode: (value: boolean) => void;
  setConfirmDelete: (value: boolean) => void;
  setAutoVersionOnReplace: (value: boolean) => void;
  setMaxVersions: (value: DriveMaxVersions) => void;
  setShareDefaultExpiry: (value: DriveShareDefaultExpiry) => void;
  setDuplicateHandling: (value: DriveDuplicateHandling) => void;
  setShowThumbnails: (value: boolean) => void;
  setShowFileExtensions: (value: boolean) => void;
  setSortOrder: (value: DriveSortOrder) => void;
  _hydrateFromServer: (data: Record<string, unknown>) => void;
}

function persistToServer(serverKey: string, value: unknown) {
  api.put('/settings', { [serverKey]: value }).catch(() => {});
}

export const useDriveSettingsStore = create<DriveSettingsState>()((set) => ({
  defaultView: 'list',
  defaultSort: 'default',
  sidebarDefault: 'files',
  showPreviewPanel: true,
  compactMode: false,
  confirmDelete: true,
  autoVersionOnReplace: true,
  maxVersions: 20,
  shareDefaultExpiry: 'never',
  duplicateHandling: 'rename',
  showThumbnails: true,
  showFileExtensions: true,
  sortOrder: 'asc',
  _hydrated: false,

  setDefaultView: (defaultView) => { set({ defaultView }); persistToServer('driveDefaultView', defaultView); },
  setDefaultSort: (defaultSort) => { set({ defaultSort }); persistToServer('driveDefaultSort', defaultSort); },
  setSidebarDefault: (sidebarDefault) => { set({ sidebarDefault }); persistToServer('driveSidebarDefault', sidebarDefault); },
  setShowPreviewPanel: (showPreviewPanel) => { set({ showPreviewPanel }); persistToServer('driveShowPreviewPanel', showPreviewPanel); },
  setCompactMode: (compactMode) => { set({ compactMode }); persistToServer('driveCompactMode', compactMode); },
  setConfirmDelete: (confirmDelete) => { set({ confirmDelete }); persistToServer('driveConfirmDelete', confirmDelete); },
  setAutoVersionOnReplace: (autoVersionOnReplace) => { set({ autoVersionOnReplace }); persistToServer('driveAutoVersionOnReplace', autoVersionOnReplace); },
  setMaxVersions: (maxVersions) => { set({ maxVersions }); persistToServer('driveMaxVersions', maxVersions); },
  setShareDefaultExpiry: (shareDefaultExpiry) => { set({ shareDefaultExpiry }); persistToServer('driveShareDefaultExpiry', shareDefaultExpiry); },
  setDuplicateHandling: (duplicateHandling) => { set({ duplicateHandling }); persistToServer('driveDuplicateHandling', duplicateHandling); },
  setShowThumbnails: (showThumbnails) => { set({ showThumbnails }); persistToServer('driveShowThumbnails', showThumbnails); },
  setShowFileExtensions: (showFileExtensions) => { set({ showFileExtensions }); persistToServer('driveShowFileExtensions', showFileExtensions); },
  setSortOrder: (sortOrder) => { set({ sortOrder }); persistToServer('driveSortOrder', sortOrder); },
  _hydrateFromServer: (data: Record<string, unknown>) => {
    const map: Record<string, string> = {
      driveDefaultView: 'defaultView',
      driveDefaultSort: 'defaultSort',
      driveSidebarDefault: 'sidebarDefault',
      driveShowPreviewPanel: 'showPreviewPanel',
      driveCompactMode: 'compactMode',
      driveConfirmDelete: 'confirmDelete',
      driveAutoVersionOnReplace: 'autoVersionOnReplace',
      driveMaxVersions: 'maxVersions',
      driveShareDefaultExpiry: 'shareDefaultExpiry',
      driveDuplicateHandling: 'duplicateHandling',
      driveShowThumbnails: 'showThumbnails',
      driveShowFileExtensions: 'showFileExtensions',
      driveSortOrder: 'sortOrder',
    };
    const patch: Record<string, unknown> = {};
    for (const [serverKey, localKey] of Object.entries(map)) {
      if (serverKey in data && data[serverKey] !== undefined && data[serverKey] !== null) {
        patch[localKey] = data[serverKey];
      }
    }
    set({ ...patch, _hydrated: true } as Partial<DriveSettingsState>);
  },
}));

export function useDriveSettingsSync() {
  const hydrateFromServer = useDriveSettingsStore((s) => s._hydrateFromServer);
  const hydrated = useDriveSettingsStore((s) => s._hydrated);

  const { data: serverSettings } = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: async () => {
      const { data } = await api.get('/settings');
      return data.data as Record<string, unknown> | null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (serverSettings && !hydrated) {
      hydrateFromServer(serverSettings);
    }
  }, [serverSettings, hydrated, hydrateFromServer]);
}
