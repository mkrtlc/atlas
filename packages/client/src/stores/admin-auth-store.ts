import { create } from 'zustand';

interface AdminAuthState {
  isAuthenticated: boolean;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  isAuthenticated: false,
  username: null,

  login: (token: string, username: string) => {
    localStorage.setItem('atlas_admin_token', token);
    localStorage.setItem('atlas_admin_username', username);
    set({ isAuthenticated: true, username });
  },

  logout: () => {
    localStorage.removeItem('atlas_admin_token');
    localStorage.removeItem('atlas_admin_username');
    set({ isAuthenticated: false, username: null });
  },

  hydrate: () => {
    const token = localStorage.getItem('atlas_admin_token');
    const username = localStorage.getItem('atlas_admin_username');
    if (token && username) {
      set({ isAuthenticated: true, username });
    }
  },
}));
