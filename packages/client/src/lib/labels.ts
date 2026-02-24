export interface Label {
  id: string;
  name: string;
  color: string; // CSS color value
  parentId: string | null;
}

export const DEFAULT_LABELS: Label[] = [
  { id: 'urgent', name: 'Urgent', color: '#dc2626', parentId: null },
  { id: 'follow-up', name: 'Follow up', color: '#d97706', parentId: null },
  { id: 'waiting', name: 'Waiting', color: '#7c3aed', parentId: null },
  { id: 'personal', name: 'Personal', color: '#059669', parentId: null },
  { id: 'work', name: 'Work', color: '#2563eb', parentId: null },
  { id: 'finance', name: 'Finance', color: '#0891b2', parentId: null },
];

// Imported after DEFAULT_LABELS to avoid a circular-init issue:
// label-store initialises with DEFAULT_LABELS, so we must define it first.
// eslint-disable-next-line import/first
import { useLabelStore } from '../stores/label-store';

/** Look up a label definition by its ID. Reads from the live label store. */
export function getLabelById(id: string): Label | undefined {
  return useLabelStore.getState().labels.find((l) => l.id === id);
}
