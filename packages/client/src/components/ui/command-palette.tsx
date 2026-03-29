import * as Dialog from '@radix-ui/react-dialog';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SHORTCUTS } from '@atlasmail/shared';
import { useUIStore } from '../../stores/ui-store';
import { Kbd } from './kbd';
import { Search } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description?: string;
  keys: string;
  action?: () => void;
}

export function CommandPalette() {
  const { t } = useTranslation();
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');

  // Build commands list from keyboard shortcuts
  const allCommands: Command[] = useMemo(() => {
    const shortcutCommands: Command[] = DEFAULT_SHORTCUTS
      .map((s) => ({ id: s.id, label: s.label, description: s.description, keys: s.keys }));

    return shortcutCommands;
  }, [t]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const lower = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(lower) ||
        (c.description && c.description.toLowerCase().includes(lower)),
    );
  }, [query, allCommands]);

  function handleSelect(cmd: Command) {
    cmd.action?.();
    toggleCommandPalette();
    setQuery('');
  }

  return (
    <Dialog.Root
      open={commandPaletteOpen}
      onOpenChange={(open) => {
        if (!open) {
          setQuery('');
          toggleCommandPalette();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="command-palette-overlay" />
        <Dialog.Content className="command-palette-content" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">{t('commandPalette.title')}</Dialog.Title>

          {/* Search input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 var(--spacing-lg)',
              gap: 'var(--spacing-sm)',
              borderBottom: '1px solid var(--color-border-primary)',
            }}
          >
            <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
            <input
              className="command-palette-input"
              style={{ borderBottom: 'none', padding: 'var(--spacing-lg) 0' }}
              placeholder={t('commandPalette.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  toggleCommandPalette();
                  setQuery('');
                }
              }}
            />
          </div>

          {/* Command list */}
          <div className="command-palette-list" role="listbox" aria-label={t('commandPalette.commands')}>
            {filteredCommands.length === 0 ? (
              <div
                style={{
                  padding: 'var(--spacing-2xl)',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--font-size-md)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('commandPalette.noResults', { query })}
              </div>
            ) : (
              filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  className="command-palette-item"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(cmd)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="command-label">{cmd.label}</span>
                    {cmd.description && (
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-tertiary)',
                          fontFamily: 'var(--font-family)',
                        }}
                      >
                        {cmd.description}
                      </span>
                    )}
                  </div>
                  <Kbd shortcut={cmd.keys} />
                </button>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
