import { SITE_URL } from './site';

// A push to the owner's phone for each report (the IT Rules expect fast action; a 2-hour clock for intimate images).
// REPORT_ALERT_URL is any URL that takes a plain-text POST, e.g. an ntfy.sh topic (free phone app): https://ntfy.sh/<secret-topic>.
// Not set = no alert. Never blocks or breaks the report itself.
export async function alertOwner(title: string, body: string, urgent = false) {
  const url = process.env.REPORT_ALERT_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      body,
      headers: { Title: title.replace(/[^\x20-\x7e]/g, '?').slice(0, 120), Priority: urgent ? 'urgent' : 'default', Click: `${SITE_URL}/admin` },
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // The report is saved either way; the owner also sees it on /admin.
  }
}
