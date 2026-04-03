import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, Briefcase, Users, Building2, FolderKanban, PenTool, HardDrive,
  Table2, CheckSquare, FileText, Pencil, Monitor, CalendarDays, Store,
  Plus, LayoutDashboard, Settings,
} from 'lucide-react';
import { useGlobalSearch } from '../../hooks/use-global-search';
import type { GlobalSearchResult } from '@atlasmail/shared';
import '../../styles/command-palette.css';

const NAV_ITEMS = [
  { id: 'crm', labelKey: 'sidebar.crm', icon: Briefcase, path: '/crm' },
  { id: 'hr', labelKey: 'sidebar.hr', icon: Users, path: '/hr' },
  { id: 'calendar', labelKey: 'sidebar.calendar', icon: CalendarDays, path: '/calendar' },
  { id: 'projects', labelKey: 'sidebar.projects', icon: FolderKanban, path: '/projects' },
  { id: 'sign', labelKey: 'sidebar.sign', icon: PenTool, path: '/sign-app' },
  { id: 'drive', labelKey: 'sidebar.drive', icon: HardDrive, path: '/drive' },
  { id: 'tables', labelKey: 'sidebar.tables', icon: Table2, path: '/tables' },
  { id: 'tasks', labelKey: 'sidebar.tasks', icon: CheckSquare, path: '/tasks' },
  { id: 'docs', labelKey: 'sidebar.write', icon: FileText, path: '/docs' },
  { id: 'draw', labelKey: 'sidebar.draw', icon: Pencil, path: '/draw' },
  { id: 'system', labelKey: 'sidebar.system', icon: Monitor, path: '/system' },
  { id: 'marketplace', labelKey: 'sidebar.marketplace', icon: Store, path: '/marketplace' },
  { id: 'settings', labelKey: 'common.settings', icon: Settings, path: '/settings' },
];

const ACTION_ITEMS = [
  { id: 'new-contact', labelKey: 'commandPalette.createContact', icon: Plus, path: '/crm?view=contacts', keywords: ['new', 'add', 'contact'] },
  { id: 'new-deal', labelKey: 'commandPalette.createDeal', icon: Plus, path: '/crm?view=pipeline', keywords: ['new', 'add', 'deal'] },
  { id: 'new-task', labelKey: 'commandPalette.newTask', icon: Plus, path: '/tasks', keywords: ['new', 'add', 'task'] },
  { id: 'new-doc', labelKey: 'commandPalette.newDocument', icon: Plus, path: '/docs', keywords: ['new', 'add', 'document'] },
  { id: 'new-drawing', labelKey: 'commandPalette.newDrawing', icon: Plus, path: '/draw', keywords: ['new', 'add', 'drawing'] },
];

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { data: searchResults } = useGlobalSearch(query.length >= 2 ? query : '');

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
    const nav = NAV_ITEMS.find((n) => n.id === value);
    if (nav) { navigate(nav.path); return; }
    const action = ACTION_ITEMS.find((a) => a.id === value);
    if (action) { navigate(action.path); return; }
    if (value.startsWith('search-') && searchResults) {
      const result = searchResults.find((r) => `search-${r.appId}-${r.recordId}` === value);
      if (result) {
        const routes: Record<string, string> = {
          crm: '/crm', hr: '/hr', tasks: '/tasks', drive: '/drive',
          docs: '/docs', draw: '/draw', tables: '/tables', sign: '/sign-app', projects: '/projects',
        };
        navigate(`${routes[result.appId] || '/' + result.appId}?id=${result.recordId}`);
      }
    }
  }, [navigate, searchResults]);

  const getResultIcon = (appId: string) => {
    const icons: Record<string, typeof Briefcase> = {
      crm: Briefcase, hr: Users, tasks: CheckSquare, drive: HardDrive,
      docs: FileText, draw: Pencil, tables: Table2, sign: PenTool, projects: FolderKanban,
    };
    const Icon = icons[appId] || LayoutDashboard;
    return <Icon size={14} />;
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t('common.commandPalette')}
      overlayClassName="cmd-overlay"
      contentClassName="cmd-content"
    >
      <div className="cmd-header">
        <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={t('common.commandPalette')}
          className="cmd-input"
        />
      </div>

      <Command.List className="cmd-list">
        <Command.Empty className="cmd-empty">{t('common.noResults')}</Command.Empty>

        {searchResults && searchResults.length > 0 && (
          <Command.Group heading={t('common.records')}>
            {searchResults.slice(0, 8).map((result) => (
              <Command.Item
                key={`search-${result.appId}-${result.recordId}`}
                value={`search-${result.appId}-${result.recordId}`}
                onSelect={handleSelect}
                className="cmd-item"
              >
                <span className="cmd-item-icon">{getResultIcon(result.appId)}</span>
                <div className="cmd-item-text">
                  <span className="cmd-item-title">{result.title}</span>
                  <span className="cmd-item-desc">{result.appName}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading={t('common.navigation')}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item key={item.id} value={item.id} onSelect={handleSelect} className="cmd-item">
                <span className="cmd-item-icon"><Icon size={14} /></span>
                <span className="cmd-item-title">{t(item.labelKey)}</span>
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading={t('common.actions')}>
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item key={item.id} value={item.id} keywords={item.keywords} onSelect={handleSelect} className="cmd-item">
                <span className="cmd-item-icon"><Icon size={14} /></span>
                <span className="cmd-item-title">{t(item.labelKey)}</span>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
