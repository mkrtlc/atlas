import { db } from '../../../config/database';
import { crmWorkflows, crmDeals, crmContacts, crmCompanies, crmActivities, userSettings, notifications } from '../../../db/schema';
import { tasks as tasksTable } from '../../../db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { logger } from '../../../utils/logger';
import { resolveMaybeKey, i18nKey, I18N_KEY_PREFIX } from '../../../utils/i18n';
import { getAccountIdForUser } from '../../../utils/account-lookup';

// ─── Seed i18n key catalog ──────────────────────────────────────────
// Every seeded workflow below uses `__i18n:` prefixed keys instead of literal
// English strings. Translations live in packages/client/src/i18n/locales/*.json
// under crm.workflows.seeds.{names|taskTitles|bodies|tags}.
//
//   name key                                            | taskTitle / body / tag key
//   ----------------------------------------------------|----------------------------------------------------
//   crm.workflows.seeds.names.qualifiedScheduleDemo     | crm.workflows.seeds.taskTitles.scheduleDiscoveryCall
//   crm.workflows.seeds.names.proposalPrepareDocument   | crm.workflows.seeds.taskTitles.prepareAndSendProposal
//   crm.workflows.seeds.names.wonWelcomeTask            | crm.workflows.seeds.taskTitles.sendWelcomePackage
//   crm.workflows.seeds.names.wonSetProbability         | (update_field, no translatable string)
//   crm.workflows.seeds.names.wonTagCustomer            | crm.workflows.seeds.tags.customer
//   crm.workflows.seeds.names.lostReviewTask            | crm.workflows.seeds.taskTitles.scheduleDealLossReview
//   crm.workflows.seeds.names.lostLogActivity           | crm.workflows.seeds.bodies.dealWasLost
//   crm.workflows.seeds.names.newContactIntroEmail      | crm.workflows.seeds.taskTitles.sendIntroductionEmail
//   crm.workflows.seeds.names.callLoggedFollowUp        | crm.workflows.seeds.taskTitles.sendFollowUpAfterCall
//   crm.workflows.seeds.names.meetingLoggedNotes        | crm.workflows.seeds.taskTitles.writeMeetingNotes

// ─── Input types ────────────────────────────────────────────────────

interface CreateWorkflowInput {
  name: string;
  trigger: string;
  triggerConfig?: Record<string, unknown>;
  action: string;
  actionConfig: Record<string, unknown>;
}

interface UpdateWorkflowInput {
  name?: string;
  trigger?: string;
  triggerConfig?: Record<string, unknown>;
  action?: string;
  actionConfig?: Record<string, unknown>;
  isActive?: boolean;
}

// ─── Workflow CRUD ──────────────────────────────────────────────────

export async function listWorkflows(userId: string, tenantId: string) {
  return db
    .select()
    .from(crmWorkflows)
    .where(and(eq(crmWorkflows.userId, userId), eq(crmWorkflows.tenantId, tenantId)))
    .orderBy(desc(crmWorkflows.createdAt));
}

export async function createWorkflow(userId: string, tenantId: string, input: CreateWorkflowInput) {
  const now = new Date();

  const [created] = await db
    .insert(crmWorkflows)
    .values({
      tenantId,
      userId,
      name: input.name,
      trigger: input.trigger,
      triggerConfig: input.triggerConfig ?? {},
      action: input.action,
      actionConfig: input.actionConfig,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  logger.info({ userId, workflowId: created.id }, 'CRM workflow created');
  return created;
}

export async function updateWorkflow(userId: string, workflowId: string, input: UpdateWorkflowInput) {
  const now = new Date();
  const updates: Record<string, unknown> = { updatedAt: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.trigger !== undefined) updates.trigger = input.trigger;
  if (input.triggerConfig !== undefined) updates.triggerConfig = input.triggerConfig;
  if (input.action !== undefined) updates.action = input.action;
  if (input.actionConfig !== undefined) updates.actionConfig = input.actionConfig;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  await db
    .update(crmWorkflows)
    .set(updates)
    .where(and(eq(crmWorkflows.id, workflowId), eq(crmWorkflows.userId, userId)));

  const [updated] = await db
    .select()
    .from(crmWorkflows)
    .where(and(eq(crmWorkflows.id, workflowId), eq(crmWorkflows.userId, userId)))
    .limit(1);

  return updated || null;
}

export async function deleteWorkflow(userId: string, workflowId: string) {
  await db
    .delete(crmWorkflows)
    .where(and(eq(crmWorkflows.id, workflowId), eq(crmWorkflows.userId, userId)));
}

export async function toggleWorkflow(userId: string, workflowId: string) {
  const [existing] = await db
    .select()
    .from(crmWorkflows)
    .where(and(eq(crmWorkflows.id, workflowId), eq(crmWorkflows.userId, userId)))
    .limit(1);

  if (!existing) return null;

  const now = new Date();
  await db
    .update(crmWorkflows)
    .set({ isActive: !existing.isActive, updatedAt: now })
    .where(eq(crmWorkflows.id, workflowId));

  const [updated] = await db
    .select()
    .from(crmWorkflows)
    .where(eq(crmWorkflows.id, workflowId))
    .limit(1);

  return updated || null;
}

// ─── Workflow Execution ─────────────────────────────────────────────

export async function executeWorkflows(
  tenantId: string,
  userId: string,
  trigger: string,
  context: Record<string, unknown>,
) {
  // Find all active workflows matching this trigger for the account
  const workflows = await db
    .select()
    .from(crmWorkflows)
    .where(and(
      eq(crmWorkflows.tenantId, tenantId),
      eq(crmWorkflows.trigger, trigger),
      eq(crmWorkflows.isActive, true),
    ));

  for (const workflow of workflows) {
    try {
      // Check trigger config matches context
      if (!matchesTriggerConfig(workflow.triggerConfig, trigger, context)) {
        continue;
      }

      // Execute the action
      await executeAction(userId, tenantId, workflow.action, workflow.actionConfig, context);

      // Update execution stats
      const now = new Date();
      await db
        .update(crmWorkflows)
        .set({
          executionCount: sql`${crmWorkflows.executionCount} + 1`,
          lastExecutedAt: now,
          updatedAt: now,
        })
        .where(eq(crmWorkflows.id, workflow.id));

      logger.info({ workflowId: workflow.id, trigger, action: workflow.action }, 'CRM workflow executed');
    } catch (error) {
      logger.error({ error, workflowId: workflow.id, trigger }, 'CRM workflow execution failed');
    }
  }
}

function matchesTriggerConfig(
  config: Record<string, unknown>,
  trigger: string,
  context: Record<string, unknown>,
): boolean {
  if (!config || Object.keys(config).length === 0) return true;

  if (trigger === 'deal_stage_changed') {
    if (config.fromStage && config.fromStage !== context.fromStage) return false;
    if (config.toStage && config.toStage !== context.toStage) return false;
  }

  if (trigger === 'activity_logged') {
    if (config.activityType && config.activityType !== context.activityType) return false;
  }

  return true;
}

async function getUserLanguage(userId: string): Promise<string> {
  try {
    const accountId = await getAccountIdForUser(userId);
    if (!accountId) return 'en';
    const [row] = await db
      .select({ language: userSettings.language })
      .from(userSettings)
      .where(eq(userSettings.accountId, accountId))
      .limit(1);
    return row?.language || 'en';
  } catch {
    return 'en';
  }
}

async function executeAction(
  userId: string,
  tenantId: string,
  action: string,
  actionConfig: Record<string, unknown>,
  context: Record<string, unknown>,
) {
  const lang = await getUserLanguage(userId);
  switch (action) {
    case 'create_task': {
      const rawTitle = (actionConfig.taskTitle as string) || 'Automated task';
      const title = resolveMaybeKey(rawTitle, lang) || 'Automated task';
      const now = new Date();
      await db.insert(tasksTable).values({
        tenantId,
        userId,
        title,
        status: 'todo',
        when: 'inbox',
        priority: 'none',
        type: 'task',
        tags: [],
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });
      break;
    }
    case 'update_field': {
      const fieldName = actionConfig.fieldName as string;
      const fieldValue = actionConfig.fieldValue as string;
      const dealId = context.dealId as string | undefined;
      if (dealId && fieldName) {
        const now = new Date();
        const updates: Record<string, unknown> = { updatedAt: now };
        // Support common deal fields
        if (fieldName === 'probability') updates.probability = Number(fieldValue) || 0;
        else if (fieldName === 'value') updates.value = Number(fieldValue) || 0;
        else if (fieldName === 'title') updates.title = fieldValue;

        if (Object.keys(updates).length > 1) {
          await db.update(crmDeals).set(updates).where(eq(crmDeals.id, dealId));
        }
      }
      break;
    }
    case 'change_deal_stage': {
      const newStageId = actionConfig.newStageId as string;
      const dealId = context.dealId as string | undefined;
      if (dealId && newStageId) {
        const now = new Date();
        await db.update(crmDeals).set({ stageId: newStageId, updatedAt: now }).where(eq(crmDeals.id, dealId));
      }
      break;
    }
    case 'add_tag': {
      const rawTag = (actionConfig.tag as string) ?? '';
      const tag = resolveMaybeKey(rawTag, lang).trim();
      const dealId = context.dealId as string | undefined;
      const contactId = context.contactId as string | undefined;
      const companyId = context.companyId as string | undefined;
      if (tag) {
        const now = new Date();
        if (dealId) {
          const [deal] = await db.select().from(crmDeals).where(eq(crmDeals.id, dealId)).limit(1);
          if (deal) {
            const tags = Array.isArray(deal.tags) ? [...deal.tags] : [];
            if (!tags.includes(tag)) {
              tags.push(tag);
              await db.update(crmDeals).set({ tags, updatedAt: now }).where(eq(crmDeals.id, dealId));
            }
          }
        } else if (contactId) {
          const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, contactId)).limit(1);
          if (contact) {
            const tags = Array.isArray(contact.tags) ? [...contact.tags] : [];
            if (!tags.includes(tag)) {
              tags.push(tag);
              await db.update(crmContacts).set({ tags, updatedAt: now }).where(eq(crmContacts.id, contactId));
            }
          }
        } else if (companyId) {
          const [company] = await db.select().from(crmCompanies).where(eq(crmCompanies.id, companyId)).limit(1);
          if (company) {
            const tags = Array.isArray(company.tags) ? [...company.tags] : [];
            if (!tags.includes(tag)) {
              tags.push(tag);
              await db.update(crmCompanies).set({ tags, updatedAt: now }).where(eq(crmCompanies.id, companyId));
            }
          }
        }
      }
      break;
    }
    case 'assign_user': {
      const assignedUserId = actionConfig.assignedUserId as string | undefined;
      const dealId = context.dealId as string | undefined;
      if (dealId && assignedUserId) {
        const now = new Date();
        await db.update(crmDeals).set({ assignedUserId, updatedAt: now }).where(eq(crmDeals.id, dealId));
      }
      break;
    }
    case 'log_activity': {
      const activityType = (actionConfig.activityType as string) || 'note';
      const rawBody = (actionConfig.body as string) || '';
      const body = resolveMaybeKey(rawBody, lang);
      const dealId = context.dealId as string | undefined;
      const contactId = context.contactId as string | undefined;
      const companyId = context.companyId as string | undefined;
      const now = new Date();
      await db.insert(crmActivities).values({
        tenantId,
        userId,
        type: activityType,
        body,
        dealId: dealId ?? null,
        contactId: contactId ?? null,
        companyId: companyId ?? null,
        createdAt: now,
        updatedAt: now,
      });
      break;
    }
    case 'send_notification': {
      const message = resolveMaybeKey((actionConfig.message as string) || '', lang);
      const title = resolveMaybeKey(
        (actionConfig.title as string) || i18nKey('crm.workflows.notificationTitle'),
        lang,
      );
      if (message) {
        const now = new Date();
        const dealId = context.dealId as string | undefined;
        const contactId = context.contactId as string | undefined;
        const companyId = context.companyId as string | undefined;
        await db.insert(notifications).values({
          tenantId,
          userId,
          type: 'workflow',
          title,
          body: message,
          sourceType: dealId ? 'crm_deal' : contactId ? 'crm_contact' : companyId ? 'crm_company' : 'crm_workflow',
          sourceId: dealId || contactId || companyId || null,
          createdAt: now,
        });
      }
      break;
    }
  }
}

// ─── Seed Example Workflows ──────────────────────────────────────────

// ─── One-shot migration for existing English-literal seeded workflows ──

/**
 * Map of legacy English seed literals → `__i18n:` key replacements.
 * Idempotent: rows already using keys are skipped. Only exact string
 * matches are migrated; user-edited workflow names/strings are preserved.
 */
const SEED_NAME_MIGRATIONS: Record<string, string> = {
  'Qualified → Schedule demo': i18nKey('crm.workflows.seeds.names.qualifiedScheduleDemo'),
  'Proposal → Prepare document': i18nKey('crm.workflows.seeds.names.proposalPrepareDocument'),
  'Won → Welcome task': i18nKey('crm.workflows.seeds.names.wonWelcomeTask'),
  'Won → Set probability': i18nKey('crm.workflows.seeds.names.wonSetProbability'),
  'Won → Tag customer': i18nKey('crm.workflows.seeds.names.wonTagCustomer'),
  'Lost → Review task': i18nKey('crm.workflows.seeds.names.lostReviewTask'),
  'Lost → Log activity': i18nKey('crm.workflows.seeds.names.lostLogActivity'),
  'New contact → Intro email task': i18nKey('crm.workflows.seeds.names.newContactIntroEmail'),
  'Call logged → Follow up': i18nKey('crm.workflows.seeds.names.callLoggedFollowUp'),
  'Meeting logged → Notes': i18nKey('crm.workflows.seeds.names.meetingLoggedNotes'),
};

const SEED_TASK_TITLE_MIGRATIONS: Record<string, string> = {
  'Schedule discovery call with contact': i18nKey('crm.workflows.seeds.taskTitles.scheduleDiscoveryCall'),
  'Prepare and send proposal': i18nKey('crm.workflows.seeds.taskTitles.prepareAndSendProposal'),
  'Send welcome package to new customer': i18nKey('crm.workflows.seeds.taskTitles.sendWelcomePackage'),
  'Schedule deal loss review': i18nKey('crm.workflows.seeds.taskTitles.scheduleDealLossReview'),
  'Send introduction email': i18nKey('crm.workflows.seeds.taskTitles.sendIntroductionEmail'),
  'Send follow-up email after call': i18nKey('crm.workflows.seeds.taskTitles.sendFollowUpAfterCall'),
  'Write meeting notes and share with team': i18nKey('crm.workflows.seeds.taskTitles.writeMeetingNotes'),
};

const SEED_BODY_MIGRATIONS: Record<string, string> = {
  'Deal was lost. Review and follow up.': i18nKey('crm.workflows.seeds.bodies.dealWasLost'),
};

const SEED_TAG_MIGRATIONS: Record<string, string> = {
  customer: i18nKey('crm.workflows.seeds.tags.customer'),
};

export async function migrateSeedWorkflowsToKeys(tenantId: string): Promise<{ migrated: number }> {
  const rows = await db
    .select()
    .from(crmWorkflows)
    .where(eq(crmWorkflows.tenantId, tenantId));

  let migrated = 0;
  for (const row of rows) {
    const updates: Record<string, unknown> = {};

    // Name
    if (typeof row.name === 'string' && !row.name.startsWith(I18N_KEY_PREFIX)) {
      const replacement = SEED_NAME_MIGRATIONS[row.name];
      if (replacement) updates.name = replacement;
    }

    // Action config
    const config = (row.actionConfig ?? {}) as Record<string, unknown>;
    const nextConfig: Record<string, unknown> = { ...config };
    let configChanged = false;

    if (typeof config.taskTitle === 'string' && !config.taskTitle.startsWith(I18N_KEY_PREFIX)) {
      const replacement = SEED_TASK_TITLE_MIGRATIONS[config.taskTitle];
      if (replacement) { nextConfig.taskTitle = replacement; configChanged = true; }
    }
    if (typeof config.body === 'string' && !config.body.startsWith(I18N_KEY_PREFIX)) {
      const replacement = SEED_BODY_MIGRATIONS[config.body];
      if (replacement) { nextConfig.body = replacement; configChanged = true; }
    }
    if (typeof config.tag === 'string' && !config.tag.startsWith(I18N_KEY_PREFIX)) {
      const replacement = SEED_TAG_MIGRATIONS[config.tag];
      if (replacement) { nextConfig.tag = replacement; configChanged = true; }
    }
    if (configChanged) updates.actionConfig = nextConfig;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(crmWorkflows).set(updates).where(eq(crmWorkflows.id, row.id));
      migrated++;
    }
  }

  if (migrated > 0) {
    logger.info({ tenantId, migrated }, 'Migrated legacy seed workflows to i18n keys');
  }
  return { migrated };
}

export async function seedExampleWorkflows(userId: string, tenantId: string) {
  // Idempotency guard — skip if workflows already exist for this account.
  // If they do exist, opportunistically migrate any English-literal seed rows
  // to translation keys (idempotent — user-edited names are left alone).
  const existing = await db.select({ id: crmWorkflows.id }).from(crmWorkflows)
    .where(and(eq(crmWorkflows.userId, userId), eq(crmWorkflows.tenantId, tenantId))).limit(1);
  if (existing.length > 0) {
    const migrationResult = await migrateSeedWorkflowsToKeys(tenantId);
    return { skipped: true, ...migrationResult };
  }

  // Look up stages by name for this account
  const { crmDealStages } = await import('../../../db/schema');
  const stages = await db.select().from(crmDealStages)
    .where(eq(crmDealStages.tenantId, tenantId))
    .orderBy(asc(crmDealStages.sequence));

  const stageByName: Record<string, string> = {};
  for (const s of stages) {
    stageByName[s.name.toLowerCase()] = s.id;
  }

  const qualifiedId = stageByName['qualified'] ?? '';
  const proposalId = stageByName['proposal'] ?? '';

  const workflows: Array<{
    name: string;
    trigger: string;
    triggerConfig: Record<string, unknown>;
    action: string;
    actionConfig: Record<string, unknown>;
  }> = [
    {
      name: i18nKey('crm.workflows.seeds.names.qualifiedScheduleDemo'),
      trigger: 'deal_stage_changed',
      triggerConfig: qualifiedId ? { toStage: qualifiedId } : {},
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.scheduleDiscoveryCall') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.proposalPrepareDocument'),
      trigger: 'deal_stage_changed',
      triggerConfig: proposalId ? { toStage: proposalId } : {},
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.prepareAndSendProposal') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.wonWelcomeTask'),
      trigger: 'deal_won',
      triggerConfig: {},
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.sendWelcomePackage') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.wonSetProbability'),
      trigger: 'deal_won',
      triggerConfig: {},
      action: 'update_field',
      actionConfig: { fieldName: 'probability', fieldValue: '100' },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.wonTagCustomer'),
      trigger: 'deal_won',
      triggerConfig: {},
      action: 'add_tag',
      actionConfig: { tag: i18nKey('crm.workflows.seeds.tags.customer') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.lostReviewTask'),
      trigger: 'deal_lost',
      triggerConfig: {},
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.scheduleDealLossReview') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.lostLogActivity'),
      trigger: 'deal_lost',
      triggerConfig: {},
      action: 'log_activity',
      actionConfig: { activityType: 'note', body: i18nKey('crm.workflows.seeds.bodies.dealWasLost') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.newContactIntroEmail'),
      trigger: 'contact_created',
      triggerConfig: {},
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.sendIntroductionEmail') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.callLoggedFollowUp'),
      trigger: 'activity_logged',
      triggerConfig: { activityType: 'call' },
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.sendFollowUpAfterCall') },
    },
    {
      name: i18nKey('crm.workflows.seeds.names.meetingLoggedNotes'),
      trigger: 'activity_logged',
      triggerConfig: { activityType: 'meeting' },
      action: 'create_task',
      actionConfig: { taskTitle: i18nKey('crm.workflows.seeds.taskTitles.writeMeetingNotes') },
    },
  ];

  let created = 0;
  for (const wf of workflows) {
    await createWorkflow(userId, tenantId, wf);
    created++;
  }

  logger.info({ userId, tenantId, created }, 'Seeded CRM example workflows');
  return { created };
}
