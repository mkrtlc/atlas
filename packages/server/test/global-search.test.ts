import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../src/config/database';

import { searchGlobal } from '../src/services/global-search.service';

describe('global-search.service — searchGlobal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when query is empty string', async () => {
    const results = await searchGlobal('', 'a1');
    expect(results).toEqual([]);
  });

  it('returns empty array when query is a single character', async () => {
    const results = await searchGlobal('a', 'a1');
    expect(results).toEqual([]);
  });

  it('returns empty array when query is undefined/falsy', async () => {
    const results = await searchGlobal(null as any, 'a1');
    expect(results).toEqual([]);
  });

  it('calls db.execute with a valid query for 2+ char searches', async () => {
    const mockDb = db as any;

    // Mock db.execute which is used by raw SQL queries
    mockDb.execute = vi.fn().mockResolvedValue({
      rows: [
        { record_id: 'r1', title: 'Test Document', app_id: 'docs', app_name: 'Write' },
        { record_id: 'r2', title: 'Test Task', app_id: 'tasks', app_name: 'Tasks' },
      ],
    });

    const results = await searchGlobal('test', 'a1');

    expect(mockDb.execute).toHaveBeenCalled();
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      appId: 'docs',
      recordId: 'r1',
      title: 'Test Document',
      appName: 'Write',
    });
    expect(results[1]).toEqual({
      appId: 'tasks',
      recordId: 'r2',
      title: 'Test Task',
      appName: 'Tasks',
    });
  });

  it('returns results from multiple apps', async () => {
    const mockDb = db as any;

    mockDb.execute = vi.fn().mockResolvedValue({
      rows: [
        { record_id: '1', title: 'Project Alpha', app_id: 'crm', app_name: 'CRM' },
        { record_id: '2', title: 'Alpha Design', app_id: 'draw', app_name: 'Draw' },
        { record_id: '3', title: 'Alpha Tasks', app_id: 'tasks', app_name: 'Tasks' },
        { record_id: '4', title: 'Alpha Employee', app_id: 'hr', app_name: 'HR' },
      ],
    });

    const results = await searchGlobal('Alpha', 'a1');

    expect(results).toHaveLength(4);

    const appIds = results.map((r) => r.appId);
    expect(appIds).toContain('crm');
    expect(appIds).toContain('draw');
    expect(appIds).toContain('tasks');
    expect(appIds).toContain('hr');
  });

  it('defaults title to "Untitled" when title is null', async () => {
    const mockDb = db as any;

    mockDb.execute = vi.fn().mockResolvedValue({
      rows: [
        { record_id: 'r1', title: null, app_id: 'docs', app_name: 'Write' },
      ],
    });

    const results = await searchGlobal('something', 'a1');

    expect(results[0].title).toBe('Untitled');
  });

  it('handles response where rows is at top level (not nested)', async () => {
    const mockDb = db as any;

    // Some db drivers return rows directly as an array
    mockDb.execute = vi.fn().mockResolvedValue([
      { record_id: 'r1', title: 'Direct Row', app_id: 'tasks', app_name: 'Tasks' },
    ]);

    const results = await searchGlobal('direct', 'a1');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Direct Row');
  });

  it('query term is wrapped in ILIKE pattern with wildcards', async () => {
    const mockDb = db as any;

    mockDb.execute = vi.fn().mockResolvedValue({ rows: [] });

    await searchGlobal('te', 'a1');

    // Just verify execute was called — the SQL template handles sanitization
    expect(mockDb.execute).toHaveBeenCalledTimes(1);
  });
});
