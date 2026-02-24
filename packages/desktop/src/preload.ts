import { contextBridge } from 'electron';

// Expose a minimal API to the renderer.
// Add IPC methods here as needed (e.g. native file dialogs, notifications).
contextBridge.exposeInMainWorld('atlasDesktop', {
  platform: process.platform,
  isDesktop: true,
});
