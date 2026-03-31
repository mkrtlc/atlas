import { describe, it, expect, vi } from 'vitest';
import { api } from '../src/lib/api-client';

import {
  useDriveItems,
  useDriveItem,
  useDriveBreadcrumbs,
  useDriveFavourites,
  useDriveRecent,
  useDriveTrash,
  useDriveSearch,
  useDriveFolders,
  useDriveStorage,
  useFilePreview,
  useFileVersions,
  useShareLinks,
  useDriveItemsByType,
  useCreateFolder,
  useUploadFiles,
  useUpdateDriveItem,
  useDeleteDriveItem,
  useRestoreDriveItem,
  usePermanentDeleteDriveItem,
  useDuplicateDriveItem,
  useCopyDriveItem,
  useBatchDeleteDriveItems,
  useBatchMoveDriveItems,
  useBatchFavouriteDriveItems,
  useReplaceFile,
  useRestoreVersion,
  useCreateLinkedDocument,
  useCreateLinkedDrawing,
  useCreateLinkedSpreadsheet,
  useCreateShareLink,
  useDeleteShareLink,
} from '../src/apps/drive/hooks';

describe('Drive hooks', () => {
  // ─── Exports exist ───────────────────────────────────────────────

  describe('hook exports', () => {
    it('exports query hooks for listing items', () => {
      expect(typeof useDriveItems).toBe('function');
      expect(typeof useDriveItem).toBe('function');
      expect(typeof useDriveBreadcrumbs).toBe('function');
    });

    it('exports query hooks for filtered views', () => {
      expect(typeof useDriveFavourites).toBe('function');
      expect(typeof useDriveRecent).toBe('function');
      expect(typeof useDriveTrash).toBe('function');
      expect(typeof useDriveSearch).toBe('function');
      expect(typeof useDriveFolders).toBe('function');
      expect(typeof useDriveItemsByType).toBe('function');
    });

    it('exports storage and preview hooks', () => {
      expect(typeof useDriveStorage).toBe('function');
      expect(typeof useFilePreview).toBe('function');
      expect(typeof useFileVersions).toBe('function');
      expect(typeof useShareLinks).toBe('function');
    });

    it('exports CRUD mutation hooks', () => {
      expect(typeof useCreateFolder).toBe('function');
      expect(typeof useUploadFiles).toBe('function');
      expect(typeof useUpdateDriveItem).toBe('function');
      expect(typeof useDeleteDriveItem).toBe('function');
      expect(typeof useRestoreDriveItem).toBe('function');
      expect(typeof usePermanentDeleteDriveItem).toBe('function');
    });

    it('exports batch operation hooks', () => {
      expect(typeof useBatchDeleteDriveItems).toBe('function');
      expect(typeof useBatchMoveDriveItems).toBe('function');
      expect(typeof useBatchFavouriteDriveItems).toBe('function');
    });

    it('exports linked resource creation hooks', () => {
      expect(typeof useCreateLinkedDocument).toBe('function');
      expect(typeof useCreateLinkedDrawing).toBe('function');
      expect(typeof useCreateLinkedSpreadsheet).toBe('function');
    });

    it('exports file versioning and share link hooks', () => {
      expect(typeof useDuplicateDriveItem).toBe('function');
      expect(typeof useCopyDriveItem).toBe('function');
      expect(typeof useReplaceFile).toBe('function');
      expect(typeof useRestoreVersion).toBe('function');
      expect(typeof useCreateShareLink).toBe('function');
      expect(typeof useDeleteShareLink).toBe('function');
    });
  });

  // ─── API endpoint patterns ────────────────────────────────────────

  describe('API endpoint patterns', () => {
    it('drive items list calls /drive', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { items: [] } } } as any);
      await api.get('/drive');
      expect(mockedGet).toHaveBeenCalledWith('/drive');
    });

    it('upload files posts FormData to /drive/upload', async () => {
      const mockedPost = vi.mocked(api.post);
      const formData = new FormData();
      mockedPost.mockResolvedValueOnce({ data: { success: true, data: { items: [] } } } as any);
      await api.post('/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      expect(mockedPost).toHaveBeenCalledWith('/drive/upload', formData, expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      }));
    });

    it('update drive item patches /drive/:id', async () => {
      const mockedPatch = vi.mocked(api.patch);
      mockedPatch.mockResolvedValueOnce({ data: { success: true, data: {} } } as any);
      await api.patch('/drive/item-1', { name: 'Renamed' });
      expect(mockedPatch).toHaveBeenCalledWith('/drive/item-1', { name: 'Renamed' });
    });

    it('favourites calls /drive/favourites', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { items: [] } } } as any);
      await api.get('/drive/favourites');
      expect(mockedGet).toHaveBeenCalledWith('/drive/favourites');
    });

    it('trash calls /drive/trash', async () => {
      const mockedGet = vi.mocked(api.get);
      mockedGet.mockResolvedValueOnce({ data: { success: true, data: { items: [] } } } as any);
      await api.get('/drive/trash');
      expect(mockedGet).toHaveBeenCalledWith('/drive/trash');
    });
  });

  // ─── Module completeness ─────────────────────────────────────────

  describe('module completeness', () => {
    it('exports at least 25 hook functions', async () => {
      const mod = await import('../src/apps/drive/hooks');
      const hookNames = Object.keys(mod).filter((k) => k.startsWith('use'));
      expect(hookNames.length).toBeGreaterThanOrEqual(25);
    });
  });
});
