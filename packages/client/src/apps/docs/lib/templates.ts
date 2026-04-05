// Re-export types and constants
export type { TemplateCategory, PageTemplate } from './template-constants';
export { CATEGORY_COLORS, ALL_CATEGORIES } from './template-constants';

// Template data (imports CATEGORY_COLORS from template-constants, not from here — no circular dependency)
import { CORE_TEMPLATES } from './template-data-core';
import { EXTRA_TEMPLATES } from './template-data-extra';

export const PAGE_TEMPLATES = [
  ...CORE_TEMPLATES,
  ...EXTRA_TEMPLATES,
];
