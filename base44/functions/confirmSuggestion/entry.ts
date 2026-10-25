import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { createRecordFromSuggestion } from '../../shared/onepay.ts';

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const suggestionId = String(body.suggestion_id || '');
    const action = body.action === 'dismiss' ? 'dismiss' : 'confirm';
    if (!suggestionId) return Response.json({ error: 'suggestion_id required' }, { status: 400 });

    const suggestion = await base44.entities.GmailSuggestion.get(suggestionId).catch(() => null);
    if (!suggestion) return Response.json({ error: 'Suggestion not found' }, { status: 404 });
    // Ownership check — the request client bypasses RLS, so verify explicitly.
    if (suggestion.created_by_id !== user.id) return Response.json({ error: 'Not your suggestion' }, { status: 403 });
    if (suggestion.status !== 'pending') return Response.json({ error: `Already ${suggestion.status}` }, { status: 409 });

    if (action === 'dismiss') {
      await base44.entities.GmailSuggestion.update(suggestion.id, { status: 'dismissed' });
      await base44.entities.AuditEvent.create({ action: 'suggestion_dismissed', entity_type: 'gmail_suggestion', entity_id: suggestion.id, detail: suggestion.subject });
      return Response.json({ ok: true, action: 'dismissed' });
    }

    // Confirm → create the financial record the user approved.
    const record = await createRecordFromSuggestion(base44, suggestion);

    await base44.entities.GmailSuggestion.update(suggestion.id, { status: 'confirmed' });
    await base44.entities.AuditEvent.create({
      action: 'suggestion_confirmed', entity_type: suggestion.kind, entity_id: record.id,
      detail: `${suggestion.merchant} — ${suggestion.currency} ${suggestion.amount}`,
    });

    return Response.json({ ok: true, action: 'confirmed', kind: suggestion.kind, record_id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}