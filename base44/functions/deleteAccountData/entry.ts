import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const ENTITIES = ['Bill', 'Subscription', 'Template', 'Payment', 'Expense', 'Notification', 'AppSetting', 'IntegrationState', 'GmailSuggestion', 'DeliveryLog', 'AuditEvent'];

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.confirm !== 'DELETE') {
      return Response.json({ error: 'Send confirm: "DELETE" to erase all data' }, { status: 400 });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const counts = {};
    for (const name of ENTITIES) {
      try {
        const page = await base44.asServiceRole.entities[name].filter({ created_by_id: user.id }, { limit: 500 });
        const items = page.items ?? page;
        if (items.length > 0) {
          await base44.asServiceRole.entities[name].deleteMany({ created_by_id: user.id });
          counts[name] = items.length;
        } else {
          counts[name] = 0;
        }
      } catch (e) {
        counts[name] = `error: ${e.message}`;
      }
    }

    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        action: 'account_deleted', entity_type: 'user', entity_id: user.id, detail: `email=${user.email} records erased`,
      });
    } catch { /* final event intentionally skipped if it fails */ }

    return Response.json({ ok: true, deleted: counts });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}