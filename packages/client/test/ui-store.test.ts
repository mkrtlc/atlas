import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../src/stores/ui-store';

describe('UI store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      sidebarOpen: true,
      commandPaletteOpen: false,
      shortcutHelpOpen: false,
      searchFocused: false,
      settingsOpen: false,
      settingsApp: null,
      settingsPanel: null,
    });
    localStorage.clear();
  });

  // ─── Initial state ───────────────────────────────────────────────

  describe('initial state', () => {
    it('settings are closed by default', () => {
      const state = useUIStore.getState();
      expect(state.settingsOpen).toBe(false);
    });

    it('sidebar is open by default', () => {
      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(true);
    });

    it('command palette is closed by default', () => {
      const state = useUIStore.getState();
      expect(state.commandPaletteOpen).toBe(false);
    });

    it('shortcut help is closed by default', () => {
      const state = useUIStore.getState();
      expect(state.shortcutHelpOpen).toBe(false);
    });

    it('search is not focused by default', () => {
      const state = useUIStore.getState();
      expect(state.searchFocused).toBe(false);
    });
  });

  // ─── Settings actions ────────────────────────────────────────────

  describe('settings actions', () => {
    it('openSettings sets settingsOpen to true', () => {
      useUIStore.getState().openSettings();
      expect(useUIStore.getState().settingsOpen).toBe(true);
    });

    it('openSettings with app and panel stores them', () => {
      useUIStore.getState().openSettings('crm', 'general');
      const state = useUIStore.getState();
      expect(state.settingsOpen).toBe(true);
      expect(state.settingsApp).toBe('crm');
      expect(state.settingsPanel).toBe('general');
    });

    it('closeSettings sets settingsOpen to false', () => {
      useUIStore.getState().openSettings('crm');
      useUIStore.getState().closeSettings();
      expect(useUIStore.getState().settingsOpen).toBe(false);
    });

    it('toggleSettings flips settingsOpen', () => {
      expect(useUIStore.getState().settingsOpen).toBe(false);
      useUIStore.getState().toggleSettings();
      expect(useUIStore.getState().settingsOpen).toBe(true);
      useUIStore.getState().toggleSettings();
      expect(useUIStore.getState().settingsOpen).toBe(false);
    });

    it('openSettings persists position to localStorage', () => {
      useUIStore.getState().openSettings('drive', 'storage');
      const raw = localStorage.getItem('atlas_settings_position');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.settingsApp).toBe('drive');
      expect(parsed.settingsPanel).toBe('storage');
    });
  });

  // ─── Other toggles ──────────────────────────────────────────────

  describe('other toggles', () => {
    it('toggleSidebar flips sidebarOpen', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggleCommandPalette flips commandPaletteOpen', () => {
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
      useUIStore.getState().toggleCommandPalette();
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    });

    it('setSearchFocused updates searchFocused', () => {
      useUIStore.getState().setSearchFocused(true);
      expect(useUIStore.getState().searchFocused).toBe(true);
      useUIStore.getState().setSearchFocused(false);
      expect(useUIStore.getState().searchFocused).toBe(false);
    });
  });
});
