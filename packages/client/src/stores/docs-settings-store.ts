import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DocFontStyle = 'default' | 'serif' | 'mono';
export type DocSidebarDefault = 'tree' | 'favorites' | 'recent';

interface DocSettingsState {
  // Editor
  fontStyle: DocFontStyle;
  smallText: boolean;
  fullWidth: boolean;
  spellCheck: boolean;

  // Startup
  openLastVisited: boolean;
  sidebarDefault: DocSidebarDefault;

  // Setters
  setFontStyle: (style: DocFontStyle) => void;
  setSmallText: (value: boolean) => void;
  setFullWidth: (value: boolean) => void;
  setSpellCheck: (value: boolean) => void;
  setOpenLastVisited: (value: boolean) => void;
  setSidebarDefault: (section: DocSidebarDefault) => void;
}

export const useDocSettingsStore = create<DocSettingsState>()(
  persist(
    (set) => ({
      fontStyle: 'default',
      smallText: false,
      fullWidth: false,
      spellCheck: true,
      openLastVisited: true,
      sidebarDefault: 'tree',

      setFontStyle: (fontStyle) => set({ fontStyle }),
      setSmallText: (smallText) => set({ smallText }),
      setFullWidth: (fullWidth) => set({ fullWidth }),
      setSpellCheck: (spellCheck) => set({ spellCheck }),
      setOpenLastVisited: (openLastVisited) => set({ openLastVisited }),
      setSidebarDefault: (sidebarDefault) => set({ sidebarDefault }),
    }),
    { name: 'atlasmail-doc-settings' },
  ),
);
