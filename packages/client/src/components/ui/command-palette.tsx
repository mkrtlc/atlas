import * as Dialog from '@radix-ui/react-dialog';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_SHORTCUTS } from '@atlasmail/shared';
import { useUIStore } from '../../stores/ui-store';
import { useGlobalSearch } from '../../hooks/use-global-search';
import { Kbd } from './kbd';
import {
  Search, Briefcase, Users, Building2, FolderKanban, PenTool, HardDrive,
  Table2, CheckSquare, FileText, Pencil, Monitor, Calendar, ShoppingBag,
  Plus, ArrowRight,
} from 'lucide-react';
import type { GlobalSearchResult } from '@atlasmail/shared';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  keys?: string;
  section: 'navigation' | 'records' | 'actions' | 'shortcuts';
  action: () => void;
}

const APP_ICON_MAP: Record<string, React.ReactNode> = {
  crm: <Briefcase size={14} />,
  hr: <Users size={14} />,
  calendar: <Calendar size={14} />,
  projects: <FolderKanban size={14} />,
  sign: <PenTool size={14} />,
  drive: <HardDrive size={14} />,
  tables: <Table2 size={14} />,
  tasks: <CheckSquare size={14} />,
  docs: <FileText size={14} />,
  draw: <Pencil size={14} />,
  system: <Monitor size={14} />,
  marketplace: <ShoppingBag size={14} />,
};

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { commandPaletteOpen, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global search for records
  const { data: searchResults } = useGlobalSearch(query);

  // Navigation items
  const navigationItems: CommandItem[] = useMemo(() => [
    { id: 'nav-crm', label: 'CRM', description: t('commandPalette.goTo', { page: 'CRM' }), icon: <Briefcase size={14} />, section: 'navigation', action: () => navigate('/crm') },
    { id: 'nav-hr', label: 'HR', description: t('commandPalette.goTo', { page: 'HR' }), icon: <Users size={14} />, section: 'navigation', action: () => navigate('/hr') },
    { id: 'nav-calendar', label: 'Calendar', description: t('commandPalette.goTo', { page: 'Calendar' }), icon: <Calendar size={14} />, section: 'navigation', action: () => navigate('/calendar') },
    { id: 'nav-projects', label: 'Projects', description: t('commandPalette.goTo', { page: 'Projects' }), icon: <FolderKanban size={14} />, section: 'navigation', action: () => navigate('/projects') },
    { id: 'nav-sign', label: 'Sign', description: t('commandPalette.goTo', { page: 'Sign' }), icon: <PenTool size={14} />, section: 'navigation', action: () => navigate('/sign-app') },
    { id: 'nav-drive', label: 'Drive', description: t('commandPalette.goTo', { page: 'Drive' }), icon: <HardDrive size={14} />, section: 'navigation', action: () => navigate('/drive') },
    { id: 'nav-tables', label: 'Tables', description: t('commandPalette.goTo', { page: 'Tables' }), icon: <Table2 size={14} />, section: 'navigation', action: () => navigate('/tables') },
    { id: 'nav-tasks', label: 'Tasks', description: t('commandPalette.goTo', { page: 'Tasks' }), icon: <CheckSquare size={14} />, section: 'navigation', action: () => navigate('/tasks') },
    { id: 'nav-docs', label: 'Write', description: t('commandPalette.goTo', { page: 'Write' }), icon: <FileText size={14} />, section: 'navigation', action: () => navigate('/docs') },
    { id: 'nav-draw', label: 'Draw', description: t('commandPalette.goTo', { page: 'Draw' }), icon: <Pencil size={14} />, section: 'navigation', action: () => navigate('/draw') },
    { id: 'nav-settings', label: t('commandPalette.settings'), icon: <Monitor size={14} />, section: 'navigation', action: () => navigate('/settings') },
  ], [navigate, t]);

  // Action items
  const actionItems: CommandItem[] = useMemo(() => [
    { id: 'act-new-contact', label: t('commandPalette.createContact'), icon: <Plus size={14} />, section: 'actions', action: () => navigate('/crm?view=contacts') },
    { id: 'act-new-deal', label: t('commandPalette.createDeal'), icon: <Plus size={14} />, section: 'actions', action: () => navigate('/crm?view=deals') },
    { id: 'act-new-company', label: t('commandPalette.createCompany'), icon: <Plus size={14} />, section: 'actions', action: () => navigate('/crm?view=companies') },
    { id: 'act-new-doc', label: t('commandPalette.newDocument'), icon: <Plus size={14} />, section: 'actions', action: () => navigate('/docs') },
    { id: 'act-new-task', label: t('commandPalette.newTask'), icon: <Plus size={14} />, section: 'actions', action: () => navigate('/tasks') },
  ], [navigate, t]);

  // Shortcut items
  const shortcutItems: CommandItem[] = useMemo(() => {
    return DEFAULT_SHORTCUTS.map((s) => ({
      id: `shortcut-${s.id}`,
      label: s.label,
      description: s.description,
      keys: s.keys,
      section: 'shortcuts' as const,
      action: () => {},
    }));
  }, []);

  // Record items from search
  const recordItems: CommandItem[] = useMemo(() => {
    if (!searchResults || !query.trim()) return [];
    return searchResults.slice(0, 8).map((r: GlobalSearchResult) => ({
      id: `record-${r.appId}-${r.recordId}`,
      label: r.title,
      description: r.appName,
      icon: APP_ICON_MAP[r.appId] || <ArrowRight size={14} />,
      section: 'records' as const,
      action: () => {
        // Navigate to the record based on app type
        switch (r.appId) {
          case 'crm': navigate(`/crm`); break;
          case 'docs': navigate(`/docs/${r.recordId}`); break;
          case 'tasks': navigate(`/tasks`); break;
          case 'drive': navigate(`/drive`); break;
          case 'draw': navigate(`/draw/${r.recordId}`); break;
          case 'tables': navigate(`/tables/${r.recordId}`); break;
          default: navigate(`/${r.appId}`);
        }
      },
    }));
  }, [searchResults, query, navigate]);

  // Filter and combine all items
  const allItems = useMemo(() => {
    const lower = query.toLowerCase().trim();
    const items: CommandItem[] = [];

    // When there's a query, filter everything
    if (lower) {
      const filterFn = (c: CommandItem) =>
        c.label.toLowerCase().includes(lower) ||
        (c.description && c.description.toLowerCase().includes(lower));

      // Records first (from global search)
      items.push(...recordItems);
      // Then navigation
      items.push(...navigationItems.filter(filterFn));
      // Then actions
      items.push(...actionItems.filter(filterFn));
      // Then shortcuts
      items.push(...shortcutItems.filter(filterFn));
    } else {
      // No query: show navigation + actions, skip shortcuts/records
      items.push(...navigationItems);
      items.push(...actionItems);
    }

    return items;
  }, [query, navigationItems, actionItems, shortcutItems, recordItems]);

  // Group items by section for rendering
  const groupedItems = useMemo(() => {
    const sections: { key: string; label: string; items: CommandItem[] }[] = [];
    const sectionMap = new Map<string, CommandItem[]>();

    for (const item of allItems) {
      if (!sectionMap.has(item.section)) sectionMap.set(item.section, []);
      sectionMap.get(item.section)!.push(item);
    }

    const sectionOrder: { key: string; labelKey: string }[] = [
      { key: 'records', labelKey: 'commandPalette.records' },
      { key: 'navigation', labelKey: 'commandPalette.navigation' },
      { key: 'actions', labelKey: 'commandPalette.actions' },
      { key: 'shortcuts', labelKey: 'commandPalette.shortcuts' },
    ];

    for (const { key, labelKey } of sectionOrder) {
      const items = sectionMap.get(key);
      if (items && items.length > 0) {
        sections.push({ key, label: t(labelKey), items });
      }
    }

    return sections;
  }, [allItems, t]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    return groupedItems.flatMap((g) => g.items);
  }, [groupedItems]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, flatItems.length]);

  // Reset on close
  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  const handleSelect = useCallback((item: CommandItem) => {
    item.action();
    toggleCommandPalette();
    setQuery('');
  }, [toggleCommandPalette]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelect(flatItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      toggleCommandPalette();
      setQuery('');
    }
  }, [flatItems, selectedIndex, handleSelect, toggleCommandPalette]);

  // Compute cumulative index for rendering
  let cumulativeIndex = 0;

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
              ref={inputRef}
              className="command-palette-input"
              style={{ borderBottom: 'none', padding: 'var(--spacing-lg) 0' }}
              placeholder={t('commandPalette.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {/* Command list */}
          <div ref={listRef} className="command-palette-list" role="listbox" aria-label={t('commandPalette.commands')}>
            {flatItems.length === 0 ? (
              <div
                style={{
                  padding: 'var(--spacing-2xl)',
                  textAlign: 'center',
                  color: 'var(--color-text-tertiary)',
                  fontSize: 'var(--font-size-md)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {query.trim() ? t('commandPalette.noResultsQuery', { query }) : t('commandPalette.noResults')}
              </div>
            ) : (
              groupedItems.map((section) => {
                const sectionStart = cumulativeIndex;
                const sectionItems = section.items.map((item, i) => {
                  const globalIndex = sectionStart + i;
                  const isSelected = globalIndex === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      className={`command-palette-item${isSelected ? ' selected' : ''}`}
                      role="option"
                      aria-selected={isSelected}
                      data-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
                        {item.icon && (
                          <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                            {item.icon}
                          </span>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                          <span className="command-label">{item.label}</span>
                          {item.description && (
                            <span
                              style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-tertiary)',
                                fontFamily: 'var(--font-family)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.keys && <Kbd shortcut={item.keys} />}
                    </button>
                  );
                });
                cumulativeIndex += section.items.length;
                return (
                  <div key={section.key}>
                    <div style={{
                      padding: 'var(--spacing-sm) var(--spacing-lg)',
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontFamily: 'var(--font-family)',
                      marginTop: sectionStart === 0 ? 0 : 'var(--spacing-xs)',
                    }}>
                      {section.label}
                    </div>
                    {sectionItems}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-sm) var(--spacing-lg)',
            borderTop: '1px solid var(--color-border-primary)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Kbd shortcut="up" /> <Kbd shortcut="down" /> {t('commandPalette.toNavigate')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Kbd shortcut="enter" /> {t('commandPalette.toSelect')}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Kbd shortcut="esc" /> {t('commandPalette.toClose')}
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
