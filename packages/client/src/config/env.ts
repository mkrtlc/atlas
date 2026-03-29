export const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  isElectron: typeof window !== 'undefined' && !!(window as any).electronAPI,
};
