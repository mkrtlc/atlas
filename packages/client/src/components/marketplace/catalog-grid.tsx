import { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import type { CatalogApp } from '@atlasmail/shared';

interface CatalogGridProps {
  apps: CatalogApp[];
  onSelect: (app: CatalogApp) => void;
}

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'development', label: 'Development' },
  { value: 'communication', label: 'Communication' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'finance', label: 'Finance' },
];

export function CatalogGrid({ apps, onSelect }: CatalogGridProps) {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const filtered = apps.filter((app) => {
    if (category && app.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        app.name.toLowerCase().includes(q) ||
        app.description?.toLowerCase().includes(q) ||
        app.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search apps..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid var(--color-border-primary)',
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            fontSize: 14,
            outline: 'none',
            width: 240,
            fontFamily: 'var(--font-family)',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: category === cat.value ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                color: category === cat.value ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-family)',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))',
        gap: 16,
      }}>
        {filtered.map((app) => (
          <CatalogCard key={app.id} app={app} onClick={() => onSelect(app)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}>
          No apps found matching your search.
        </div>
      )}
    </div>
  );
}

function CatalogCard({ app, onClick }: { app: CatalogApp; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 14,
        padding: 16,
        background: hovered ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
        outline: 'none',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: app.color || '#4A90E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {app.iconUrl ? (
          <img src={app.iconUrl} alt="" style={{ width: 28, height: 28 }} />
        ) : (
          <ExternalLink size={22} color="#fff" />
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 4,
        }}>
          {app.name}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.4',
        }}>
          {app.description}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {app.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'var(--color-bg-quaternary)',
                color: 'var(--color-text-tertiary)',
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Install indicator */}
      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <Download size={18} color="var(--color-text-tertiary)" />
      </div>
    </button>
  );
}
