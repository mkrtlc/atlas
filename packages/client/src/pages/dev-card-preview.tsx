import { type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Dev-only preview of the four settings-card treatments — one per page.
 *   /dev/card-a — Ghost (transparent, hairline border)
 *   /dev/card-b — Tinted (low-opacity fill)
 *   /dev/card-c — Left accent (editorial)
 *   /dev/card-d — Floating (elevated surface + soft shadow)
 *
 * Not linked from any menu. Delete once the user picks a winner.
 */

type Variant = 'a' | 'b' | 'c' | 'd';

const VARIANT_META: Record<Variant, { letter: string; name: string; note: string }> = {
  a: { letter: 'A', name: 'Ghost', note: 'Transparent fill, hairline border, rounded-lg. Quietest.' },
  b: { letter: 'B', name: 'Tinted', note: '60% secondary-bg fill. Feels grouped but airy.' },
  c: { letter: 'C', name: 'Left accent', note: 'No frame — just a 2px rule on the left. Editorial.' },
  d: { letter: 'D', name: 'Floating', note: 'Elevated surface + soft shadow. Most distinct, heaviest.' },
};

function cardStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'a':
      return {
        background: 'transparent',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
      };
    case 'b':
      return {
        background: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
      };
    case 'c':
      return {
        background: 'transparent',
        borderLeft: '2px solid var(--color-border-primary)',
        padding: '8px 0 8px 20px',
      };
    case 'd':
      return {
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
      };
  }
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontFamily: 'var(--font-family)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}

function MockRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: '1px solid var(--color-border-secondary)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          padding: '4px 10px',
          borderRadius: 6,
          background: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border-primary)',
          color: 'var(--color-text-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Card({ variant, children }: { variant: Variant; children: ReactNode }) {
  return <section style={cardStyle(variant)}>{children}</section>;
}

function VariantNav({ current }: { current: Variant }) {
  const order: Variant[] = ['a', 'b', 'c', 'd'];
  return (
    <nav
      style={{
        display: 'flex',
        gap: 6,
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-secondary)',
        width: 'fit-content',
        marginBottom: 24,
      }}
    >
      {order.map((v) => {
        const isActive = v === current;
        return (
          <Link
            key={v}
            to={`/dev/card-${v}`}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: isActive ? 'var(--color-accent-primary)' : 'transparent',
              color: isActive ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: 'var(--font-family)',
            }}
          >
            {VARIANT_META[v].letter} — {VARIANT_META[v].name}
          </Link>
        );
      })}
    </nav>
  );
}

function PageHeader({ variant }: { variant: Variant }) {
  const meta = VARIANT_META[variant];
  return (
    <div
      style={{
        paddingBottom: 16,
        borderBottom: '1px solid var(--color-border-secondary)',
        marginBottom: 32,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--color-accent-primary)',
            color: 'var(--color-text-inverse)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {meta.letter}
        </span>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-family)' }}>
          {meta.name}
        </h1>
      </div>
      <p
        style={{
          margin: '8px 0 0 34px',
          fontSize: 13,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-family)',
        }}
      >
        {meta.note}
      </p>
    </div>
  );
}

/**
 * The single page body. Every variant renders the same three sample
 * sections so they can be compared one-to-one across the four URLs.
 */
function PreviewPage({ variant }: { variant: Variant }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        padding: '40px 48px',
        fontFamily: 'var(--font-family)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <VariantNav current={variant} />
        <PageHeader variant={variant} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card variant={variant}>
            <SectionHeader
              title="Organization defaults"
              description="Override individual user preferences"
            />
            <MockRow label="Default currency" value="USD — US Dollar" />
          </Card>

          <Card variant={variant}>
            <SectionHeader title="Date & time" description="How dates and times appear across the app" />
            <MockRow label="Date format" value="DD/MM/YYYY" />
            <MockRow label="Time format" value="24h" />
            <MockRow label="Timezone" value="Europe/Istanbul" />
          </Card>

          <Card variant={variant}>
            <SectionHeader title="Numbers & currency" />
            <MockRow label="Number format" value="1,234.56" />
            <MockRow label="Currency" value="USD" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function DeriveVariantFromPath(): Variant {
  const { pathname } = useLocation();
  const last = pathname.split('/').pop() ?? '';
  if (last.endsWith('a')) return 'a';
  if (last.endsWith('b')) return 'b';
  if (last.endsWith('c')) return 'c';
  return 'd';
}

export function DevCardAPage() { return <PreviewPage variant="a" />; }
export function DevCardBPage() { return <PreviewPage variant="b" />; }
export function DevCardCPage() { return <PreviewPage variant="c" />; }
export function DevCardDPage() { return <PreviewPage variant="d" />; }

// Unused helper kept for potential future wildcard route. Tree-shakable.
export function DevCardAutoPage() { return <PreviewPage variant={DeriveVariantFromPath()} />; }
