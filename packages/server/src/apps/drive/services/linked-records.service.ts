import { db } from '../../../config/database';
import { recordLinks, crmDeals, signatureDocuments, invoices } from '../../../db/schema';
import { and, or, eq, inArray } from 'drizzle-orm';

export interface LinkedRecord {
  appId: 'crm' | 'sign' | 'invoices';
  recordType: string;
  recordId: string;
  recordTitle: string;
  recordUrl: string;
}

/**
 * Return every record in another Atlas app that links to this Drive item,
 * via either direction of the record_links table.
 */
export async function getLinkedRecordsForDriveItem(
  driveItemId: string,
  tenantId: string,
): Promise<LinkedRecord[]> {
  const links = await db
    .select()
    .from(recordLinks)
    .where(and(
      eq(recordLinks.tenantId, tenantId),
      or(
        and(eq(recordLinks.targetAppId, 'drive'), eq(recordLinks.targetRecordId, driveItemId)),
        and(eq(recordLinks.sourceAppId, 'drive'), eq(recordLinks.sourceRecordId, driveItemId)),
      ),
    ));

  if (links.length === 0) return [];

  const byApp: Record<string, string[]> = {};
  for (const link of links) {
    const otherAppId = link.targetAppId === 'drive' ? link.sourceAppId : link.targetAppId;
    const otherRecordId = link.targetAppId === 'drive' ? link.sourceRecordId : link.targetRecordId;
    (byApp[otherAppId] ??= []).push(otherRecordId);
  }

  const [deals, sigDocs, invRows] = await Promise.all([
    byApp.crm?.length
      ? db.select({ id: crmDeals.id, title: crmDeals.title }).from(crmDeals).where(inArray(crmDeals.id, byApp.crm))
      : Promise.resolve([] as Array<{ id: string; title: string }>),
    byApp.sign?.length
      ? db.select({ id: signatureDocuments.id, title: signatureDocuments.title }).from(signatureDocuments).where(inArray(signatureDocuments.id, byApp.sign))
      : Promise.resolve([] as Array<{ id: string; title: string }>),
    byApp.invoices?.length
      ? db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber }).from(invoices).where(inArray(invoices.id, byApp.invoices))
      : Promise.resolve([] as Array<{ id: string; invoiceNumber: string }>),
  ]);

  const results: LinkedRecord[] = [];
  for (const d of deals) {
    results.push({ appId: 'crm', recordType: 'deal', recordId: d.id, recordTitle: d.title, recordUrl: `/crm/deals/${d.id}` });
  }
  for (const s of sigDocs) {
    results.push({ appId: 'sign', recordType: 'agreement', recordId: s.id, recordTitle: s.title, recordUrl: `/sign-app/${s.id}` });
  }
  for (const i of invRows) {
    results.push({ appId: 'invoices', recordType: 'invoice', recordId: i.id, recordTitle: i.invoiceNumber, recordUrl: `/invoices/${i.id}` });
  }
  return results;
}
