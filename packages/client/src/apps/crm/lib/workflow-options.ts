import { WORKFLOW_ACTIONS, WORKFLOW_TRIGGERS } from '@atlas-platform/shared';

type Translate = (key: string) => string;

const TRIGGER_LABEL_KEYS: Record<(typeof WORKFLOW_TRIGGERS)[number], string> = {
  deal_stage_changed: 'crm.automations.triggerDealStageChanged',
  deal_created: 'crm.automations.triggerDealCreated',
  deal_won: 'crm.automations.triggerDealWon',
  deal_lost: 'crm.automations.triggerDealLost',
  contact_created: 'crm.automations.triggerContactCreated',
  activity_logged: 'crm.automations.triggerActivityLogged',
};

const ACTION_LABEL_KEYS: Record<(typeof WORKFLOW_ACTIONS)[number], string> = {
  create_task: 'crm.automations.actionCreateTask',
  update_field: 'crm.automations.actionUpdateField',
  change_deal_stage: 'crm.automations.actionChangeDealStage',
  add_tag: 'crm.automations.actionAddTag',
  assign_user: 'crm.automations.actionAssignUser',
  log_activity: 'crm.automations.actionLogActivity',
  send_notification: 'crm.automations.actionSendNotification',
};

export function getTriggerOptions(t: Translate) {
  return WORKFLOW_TRIGGERS.map((value) => ({ value, label: t(TRIGGER_LABEL_KEYS[value]) }));
}

export function getActionOptions(t: Translate) {
  return WORKFLOW_ACTIONS.map((value) => ({ value, label: t(ACTION_LABEL_KEYS[value]) }));
}

export function getTriggerLabel(trigger: string, t: Translate): string {
  const key = TRIGGER_LABEL_KEYS[trigger as (typeof WORKFLOW_TRIGGERS)[number]];
  return key ? t(key) : trigger;
}

export function getActionLabel(action: string, t: Translate): string {
  const key = ACTION_LABEL_KEYS[action as (typeof WORKFLOW_ACTIONS)[number]];
  return key ? t(key) : action;
}

export function getUpdateFieldOptions(t: Translate) {
  return [
    { value: 'probability', label: t('crm.deals.probability') },
    { value: 'value', label: t('crm.deals.value') },
    { value: 'title', label: t('crm.deals.title') },
  ];
}

export function getActivityTypeOptions(t: Translate) {
  return [
    { value: 'note', label: t('crm.activities.note') },
    { value: 'call', label: t('crm.activities.call') },
    { value: 'meeting', label: t('crm.activities.meeting') },
    { value: 'email', label: t('crm.activities.email') },
  ];
}
