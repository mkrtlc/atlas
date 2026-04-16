import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useConvertCurrency } from '../../hooks/use-exchange-rates';
import { Tooltip } from '../ui/tooltip';
import { formatCurrency } from '../../lib/format';

interface CurrencyConverterProps {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

export function CurrencyConverter({
  amount,
  fromCurrency,
  toCurrency,
}: CurrencyConverterProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useConvertCurrency(
    fromCurrency,
    toCurrency,
    amount,
  );

  // Nothing to show when currencies match or amount is zero
  if (fromCurrency === toCurrency || amount <= 0) return null;

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
    fontFamily: 'var(--font-family)',
  };

  if (isLoading) {
    return (
      <span style={wrapperStyle}>
        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
        {t('currency.converting')}
      </span>
    );
  }

  if (isError || !data) {
    return (
      <Tooltip content={t('currency.unavailableTooltip')}>
        <span style={{ ...wrapperStyle, color: 'var(--color-warning)', cursor: 'default' }}>
          <AlertTriangle size={13} />
          {t('currency.unavailable')}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={t('currency.rateInfo', {
        rate: data.rate.toFixed(4),
        provider: data.provider,
      })}
    >
      <span style={{ ...wrapperStyle, cursor: 'default' }}>
        = {formatCurrency(data.converted)} {toCurrency}
      </span>
    </Tooltip>
  );
}
