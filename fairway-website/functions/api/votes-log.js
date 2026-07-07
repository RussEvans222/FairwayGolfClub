// Cloudflare Pages Function — internal viewer for survey votes with location.
// Protected by an ADMIN_KEY environment variable (set in Pages project settings).
// Visit /api/votes-log?key=YOUR_ADMIN_KEY to view recent votes.

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response("Not authorized", { status: 401 });
  }
  if (!env.VOTES_KV) {
    return new Response("Not configured", { status: 500 });
  }

  const list = await env.VOTES_KV.list({ prefix: "vote:", limit: 500 });
  const events = (
    await Promise.all(
      list.keys.map(async (k) => {
        const raw = await env.VOTES_KV.get(k.name);
        return raw ? JSON.parse(raw) : null;
      })
    )
  )
    .filter(Boolean)
    .sort((a, b) => b.ts - a.ts);

  const rows = events
    .map((e) => {
      const time = new Date(e.ts).toLocaleString("en-US", { timeZone: "America/New_York" });
      const location = [e.city, e.region, e.country].filter(Boolean).join(", ");
      return `<tr><td>${escapeHtml(time)}</td><td>${escapeHtml(e.vote)}</td><td>${escapeHtml(location)}</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="robots" content="noindex, nofollow">
<title>Survey Votes Log</title>
<style>
body { font-family: -apple-system, sans-serif; background: #0C1422; color: #fff; padding: 2rem; }
table { border-collapse: collapse; width: 100%; max-width: 700px; }
th, td { padding: 0.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; font-size: 0.9rem; }
th { color: #C9A84C; }
h1 { font-size: 1.2rem; margin-bottom: 1rem; }
</style>
</head>
<body>
<h1>Survey Votes — most recent ${events.length}</h1>
<table>
<thead><tr><th>Time (ET)</th><th>Vote</th><th>Location</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html" } });
}
