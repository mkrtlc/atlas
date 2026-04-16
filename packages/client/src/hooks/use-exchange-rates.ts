import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface ConversionResult {
  from: string;
  to: string;
  rate: number;
  amount: number;
  converted: number;
  provider: string;
  cached: boolean;
}

export function useConvertCurrency(
  from: string | undefined,
  to: string | undefined,
  amount: number,
) {
  return useQuery({
    queryKey: ['exchange-rates', 'convert', from, to, amount],
    queryFn: async () => {
      const { data } = await api.get('/exchange-rates/convert', {
        params: { from, to, amount },
      });
      return data.data as ConversionResult;
    },
    enabled: !!from && !!to && from !== to && amount > 0,
    staleTime: 60 * 60 * 1000, // 1 hour — rates don't change often
    retry: 1,
  });
}
