export async function performAskAction(
  key: string,
  payload: { summary: string; filename: string; buildingId?: string|null; textExcerpt?: string }
): Promise<{ ok: boolean; message?: string; redirect?: string }> {
  const { summary, filename, buildingId = null, textExcerpt } = payload;

  async function post(url: string, body: any) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const ok = res.ok;
      let msg = '';
      try { const j = await res.json(); msg = j?.message || j?.error || ''; } catch {}
      return { ok, message: msg };
    } catch (e:any) {
      return { ok: false, message: e?.message || 'Request failed' };
    }
  }

  switch (key) {
    case 'create_letter':
      return { ok: true, redirect: `/communications/templates?from=ask&filename=${encodeURIComponent(filename)}` };

    case 'email_draft': {
      const r = await post('/api/generate-email-draft', {
        subject: `Summary: ${filename}`,
        body: summary,
        buildingId,
        source: 'ask-blociq',
      });
      if (!r.ok) return { ok: false, message: r.message || 'Could not generate draft', redirect: '/communications?compose=1' };
      return { ok: true, message: 'Email draft created' };
    }

    case 'save_notice': {
      const r = await post('/api/save-draft', {
        title: filename,
        content: summary,
        type: 'notice',
        buildingId,
        source: 'ask-blociq',
      });
      return r.ok ? { ok: true, message: 'Notice saved' } : { ok: false, message: r.message || 'Failed to save notice' };
    }

    case 'add_task': {
      const r = await post('/api/create-task-from-suggestion', {
        title: `Follow-up: ${filename}`,
        description: summary,
        buildingId,
        source: 'ask-blociq',
      });
      return r.ok ? { ok: true, message: 'Task created' } : { ok: false, message: r.message || 'Failed to create task' };
    }

    case 'extract_contacts': {
      const r = await post('/api/extract', {
        text: textExcerpt || summary,
        mode: 'contacts',
        buildingId,
        source: 'ask-blociq',
      });
      return r.ok ? { ok: true, message: 'Contacts extracted' } : { ok: false, message: r.message || 'Failed to extract contacts' };
    }

    case 'schedule_event': {
      const r = await post('/api/create-event', {
        title: `Meeting re ${filename}`,
        notes: summary,
        buildingId,
        source: 'ask-blociq',
      });
      return r.ok ? { ok: true, message: 'Event created' } : { ok: false, message: r.message || 'Failed to create event' };
    }

    case 'classify_document': {
      const r = await post('/api/classify-document', {
        text: textExcerpt || summary,
        filename,
        buildingId,
        source: 'ask-blociq',
      });
      return r.ok ? { ok: true, message: 'Document classified' } : { ok: false, message: r.message || 'Failed to classify' };
    }

    default:
      return { ok: false, message: `Unknown action: ${key}` };
  }
}
