import { type ReactNode, type CSSProperties } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export interface ColumnHeaderProps {
  /** Column label text */
  label: string;
  /** Optional Lucide icon to show before the label */
  icon?: ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Current sort column key (for highlighting active sort) */
  sortColumn?: string | null;
  /** This column's sort key */
  columnKey?: string;
  /** Current sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Called when the header is clicked for sorting */
  onSort?: (columnKey: string) => void;
  /** Additional style */
  style?: CSSProperties;
}

export function ColumnHeader({
  label,
  icon,
  sortable = false,
  sortColumn,
  columnKey,
  sortDirection,
  onSort,
  style,
}: ColumnHeaderProps) {
  const isActive = sortable && sortColumn === columnKey;
  const handleClick = () => {
    if (sortable && columnKey && onSort) {
      onSort(columnKey);
    }
  };

  return (
    <span
      onClick={sortable ? handleClick : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-semibold)',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-family)',
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (sortable) e.currentTarget.style.color = 'var(--color-text-primary)';
      }}
      onMouseLeave={(e) => {
        if (sortable && !isActive) e.currentTarget.style.color = 'var(--color-text-tertiary)';
      }}
    >
      {icon && (
        <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.6, flexShrink: 0 }}>
          {icon}
        </span>
      )}
      {label}
      {isActive && (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2 }}>
          {sortDirection === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        </span>
      )}
    </span>
  );
}
