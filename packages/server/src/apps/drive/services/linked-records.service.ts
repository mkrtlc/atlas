import { db } from '../../../config/database';
import { recordLinks, crmDeals, signatureDocuments, invoices } from '../../../db/schema';
import { and, or, eq } from 'drizzle-orm';

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
  const results: LinkedRecord[] = [];

  const inboundLinks = await db
    .select()
    .from(recordLinks)
    .where(and(
      eq(recordLinks.tenantId, tenantId),
      or(
        and(eq(recordLinks.targetAppId, 'drive'), eq(recordLinks.targetRecordId, driveItemId)),
        and(eq(recordLinks.sourceAppId, 'drive'), eq(recordLinks.sourceRecordId, driveItemId)),
      ),
    ));

  for (const link of inboundLinks) {
    const otherAppId = link.targetAppId === 'drive' ? link.sourceAppId : link.targetAppId;
    const otherRecordId = link.targetAppId === 'drive' ? link.sourceRecordId : link.targetRecordId;

    if (otherAppId === 'crm') {
      const [deal] = await db
        .select({ id: crmDeals.id, title: crmDeals.title })
        .from(crmDeals)
        .where(eq(crmDeals.id, otherRecordId))
        .limit(1);
      if (deal) {
        results.push({
          appId: 'crm',
          recordType: 'deal',
          recordId: deal.id,
          recordTitle: deal.title,
          recordUrl: `/crm/deals/${deal.id}`,
        });
      }
    } else if (otherAppId === 'sign') {
      const [doc] = await db
        .select({ id: signatureDocuments.id, title: signatureDocuments.title })
        .from(signatureDocuments)
        .where(eq(signatureDocuments.id, otherRecordId))
        .limit(1);
      if (doc) {
        results.push({
          appId: 'sign',
          recordType: 'agreement',
          recordId: doc.id,
          recordTitle: doc.title,
          recordUrl: `/sign-app/${doc.id}`,
        });
      }
    } else if (otherAppId === 'invoices') {
      const [inv] = await db
        .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
        .from(invoices)
        .where(eq(invoices.id, otherRecordId))
        .limit(1);
      if (inv) {
        results.push({
          appId: 'invoices',
          recordType: 'invoice',
          recordId: inv.id,
          recordTitle: inv.invoiceNumber,
          recordUrl: `/invoices/${inv.id}`,
        });
      }
    }
  }

  return results;
}
