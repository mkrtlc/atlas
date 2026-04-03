import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, Briefcase, Users, Building2, FolderKanban, PenTool, HardDrive,
  Table2, CheckSquare, FileText, Pencil, Monitor, CalendarDays, Store,
  Plus, LayoutDashboard, Clock, Settings,
} from 'lucide-react';
import { useGlobalSearch } from '../../hooks/use-global-search';
import type { GlobalSearchResult } from '@atlasmail/shared';
import '../../styles/command-palette.css';

// ─── Navigation items ────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'crm', label: 'CRM', icon: Briefcase, path: '/crm' },
  { id: 'hr', label: 'HRM', icon: Users, path: '/hr' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, path: '/projects' },
  { id: 'sign', label: 'Sign', icon: PenTool, path: '/sign-app' },
  { id: 'drive', label: 'Drive', icon: HardDrive, path: '/drive' },
  { id: 'tables', label: 'Tables', icon: Table2, path: '/tables' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, path: '/tasks' },
  { id: 'docs', label: 'Write', icon: FileText, path: '/docs' },
  { id: 'draw', label: 'Draw', icon: Pencil, path: '/draw' },
  { id: 'system', label: 'System', icon: Monitor, path: '/system' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, path: '/marketplace' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

const ACTION_ITEMS = [
  { id: 'new-contact', label: 'Create contact', icon: Plus, path: '/crm?view=contacts', keywords: 'new add contact' },
  { id: 'new-deal', label: 'Create deal', icon: Plus, path: '/crm?view=pipeline', keywords: 'new add deal' },
  { id: 'new-task', label: 'Create task', icon: Plus, path: '/tasks', keywords: 'new add task todo' },
  { id: 'new-doc', label: 'New document', icon: Plus, path: '/docs', keywords: 'new add document write' },
  { id: 'new-drawing', label: 'New drawing', icon: Plus, path: '/draw', keywords: 'new add drawing sketch' },
];

// ─── Component ───────────────────────────────────────────────────

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const { data: searchResults } = useGlobalSearch(query.length >= 2 ? query : '');

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback((value: string) => {
    setOpen(false);
    setQuery('');

    // Check navigation items
    const nav = NAV_ITEMS.find((n) => n.id === value);
    if (nav) { navigate(nav.path); return; }

    // Check action items
    const action = ACTION_ITEMS.find((a) => a.id === value);
    if (action) { navigate(action.path); return; }

    // Check search results — value format: "search-{appId}-{recordId}"
    if (value.startsWith('search-') && searchResults) {
      const result = searchResults.find((r) => `search-${r.appId}-${r.recordId}` === value);
      if (result) {
        const appRoutes: Record<string, string> = {
          crm: '/crm', hr: '/hr', tasks: '/tasks', drive: '/drive',
          docs: '/docs', draw: '/draw', tables: '/tables', sign: '/sign-app',
          projects: '/projects',
        };
        const base = appRoutes[result.appId] || `/${result.appId}`;
        navigate(`${base}?id=${result.recordId}`);
      }
    }
  }, [navigate, searchResults]);

  const getResultIcon = (appId: string) => {
    const icons: Record<string, typeof Briefcase> = {
      crm: Briefcase, hr: Users, tasks: CheckSquare, drive: HardDrive,
      docs: FileText, draw: Pencil, tables: Table2, sign: PenTool,
      projects: FolderKanban,
    };
    const Icon = icons[appId] || LayoutDashboard;
    return <Icon size={14} />;
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t('common.commandPalette')}
      className="cmd-palette"
      shouldFilter={true}
    >
      <div className="cmd-palette-header">
        <Search size={16} className="cmd-palette-search-icon" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t('common.commandPalette')}
          className="cmd-palette-input"
        />
      </div>

      <Command.List className="cmd-palette-list">
        <Command.Empty className="cmd-palette-empty">
          {t('common.noResults')}
        </Command.Empty>

        {/* Search results */}
        {searchResults && searchResults.length > 0 && (
          <Command.Group heading={t('common.records')} className="cmd-palette-group">
            {searchResults.slice(0, 8).map((result) => (
              <Command.Item
                key={`search-${result.appId}-${result.recordId}`}
                value={`search-${result.appId}-${result.recordId}`}
                onSelect={handleSelect}
                className="cmd-palette-item"
              >
                <span className="cmd-palette-item-icon">{getResultIcon(result.appId)}</span>
                <div className="cmd-palette-item-text">
                  <span className="cmd-palette-item-title">{result.title}</span>
                  <span className="cmd-palette-item-desc">{result.appName || result.appId}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Navigation */}
        <Command.Group heading={t('common.navigation')} className="cmd-palette-group">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item
                key={item.id}
                value={item.id}
                keywords={[item.label]}
                onSelect={handleSelect}
                className="cmd-palette-item"
              >
                <span className="cmd-palette-item-icon"><Icon size={14} /></span>
                <span className="cmd-palette-item-title">{item.label}</span>
              </Command.Item>
            );
          })}
        </Command.Group>

        {/* Actions */}
        <Command.Group heading={t('common.actions')} className="cmd-palette-group">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item
                key={item.id}
                value={item.id}
                keywords={item.keywords.split(' ')}
                onSelect={handleSelect}
                className="cmd-palette-item"
              >
                <span className="cmd-palette-item-icon"><Icon size={14} /></span>
                <span className="cmd-palette-item-title">{item.label}</span>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
