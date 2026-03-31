import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutHelpOpen: boolean;
  searchFocused: boolean;
  settingsOpen: boolean;
  settingsApp: string | null;
  settingsPanel: string | null;
  toggleSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleShortcutHelp: () => void;
  setSearchFocused: (focused: boolean) => void;
  toggleSettings: () => void;
  openSettings: (app?: string, panel?: string) => void;
  closeSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  shortcutHelpOpen: false,
  searchFocused: false,
  settingsOpen: false,
  settingsApp: null,
  settingsPanel: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleShortcutHelp: () => set((s) => ({ shortcutHelpOpen: !s.shortcutHelpOpen })),
  setSearchFocused: (focused) => set({ searchFocused: focused }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openSettings: (app, panel) => set({ settingsOpen: true, settingsApp: app ?? null, settingsPanel: panel ?? null }),
  closeSettings: () => set({ settingsOpen: false }),
}));
