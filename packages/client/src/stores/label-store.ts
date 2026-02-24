import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Label } from '../lib/labels';
import { DEFAULT_LABELS } from '../lib/labels';

interface LabelState {
  labels: Label[];
  addLabel: (name: string, color: string, parentId?: string | null) => string;
  updateLabel: (id: string, updates: Partial<Omit<Label, 'id'>>) => void;
  deleteLabel: (id: string) => void;
  moveLabel: (id: string, newParentId: string | null) => void;
}

export const useLabelStore = create<LabelState>()(
  persist(
    (set) => ({
      labels: DEFAULT_LABELS,
      addLabel: (name, color, parentId) => {
        const id = 'label-' + crypto.randomUUID();
        set((s) => ({ labels: [...s.labels, { id, name, color, parentId: parentId ?? null }] }));
        return id;
      },
      updateLabel: (id, updates) => {
        set((s) => ({
          labels: s.labels.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        }));
      },
      deleteLabel: (id) => {
        set((s) => {
          // Collect all descendant IDs to cascade the delete
          const toDelete = new Set<string>([id]);
          let size = 0;
          while (toDelete.size !== size) {
            size = toDelete.size;
            for (const l of s.labels) {
              if (l.parentId && toDelete.has(l.parentId)) toDelete.add(l.id);
            }
          }
          return { labels: s.labels.filter((l) => !toDelete.has(l.id)) };
        });
      },
      moveLabel: (id, newParentId) => {
        set((s) => {
          // Prevent circular parent references — check if newParentId
          // is a descendant of id.
          if (newParentId) {
            let cursor: string | null = newParentId;
            while (cursor) {
              if (cursor === id) return s; // would create a cycle
              const parent = s.labels.find((l) => l.id === cursor);
              cursor = parent?.parentId ?? null;
            }
          }
          return {
            labels: s.labels.map((l) => (l.id === id ? { ...l, parentId: newParentId } : l)),
          };
        });
      },
    }),
    {
      name: 'atlasmail-labels',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        if (version < 2) {
          const state = persisted as { labels: Array<{ id: string; name: string; color: string; parentId?: string | null }> };
          return {
            ...state,
            labels: state.labels.map((l) => ({ ...l, parentId: l.parentId ?? null })),
          };
        }
        return persisted;
      },
    },
  ),
);
