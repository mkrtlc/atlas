import { create } from 'zustand';

interface CrmSettingsState {
  defaultView: 'pipeline' | 'deals' | 'contacts' | 'companies' | 'activities';
  currencySymbol: string;
  setDefaultView: (view: CrmSettingsState['defaultView']) => void;
  setCurrencySymbol: (symbol: string) => void;
}

export const useCrmSettingsStore = create<CrmSettingsState>((set) => ({
  defaultView: 'pipeline',
  currencySymbol: '$',
  setDefaultView: (defaultView) => set({ defaultView }),
  setCurrencySymbol: (currencySymbol) => set({ currencySymbol }),
}));
