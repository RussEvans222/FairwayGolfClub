// Worker entry for fairwaygolfclub.co (Workers + static assets, config in ../wrangler.jsonc).
// Handles the homepage survey API; every other request falls through to the static assets.
// Requires a KV namespace bound as VOTES_KV (kv_namespaces in wrangler.jsonc) and an
// ADMIN_KEY secret (dashboard → Worker → Settings → Variables and Secrets) for /api/votes-log.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function voteGet(env) {
  if (!env.VOTES_KV) return json({ error: "not configured" }, 500);

  const [yes, no] = await Promise.all([
    env.VOTES_KV.get("count:yes"),
    env.VOTES_KV.get("count:no"),
  ]);
  return json({ yes: Number(yes) || 0, no: Number(no) || 0 });
}

async function votePost(request, env) {
  if (!env.VOTES_KV) return json({ error: "not configured" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid body" }, 400);
  }

  const vote = body && body.vote;
  if (vote !== "yes" && vote !== "no") {
    return json({ error: "vote must be 'yes' or 'no'" }, 400);
  }

  const countKey = `count:${vote}`;
  const current = Number(await env.VOTES_KV.get(countKey)) || 0;
  await env.VOTES_KV.put(countKey, String(current + 1));

  const cf = request.cf || {};
  const city = cf.city || "Unknown";
  const region = cf.regionCode || cf.region || "";
  const country = cf.country || "";

  const eventKey = `vote:${new Date().toISOString()}:${crypto.randomUUID().slice(0, 8)}`;
  await env.VOTES_KV.put(
    eventKey,
    JSON.stringify({ vote, city, region, country, ts: Date.now() }),
    { expirationTtl: 60 * 60 * 24 * 180 }
  );

  const [yes, no] = await Promise.all([
    env.VOTES_KV.get("count:yes"),
    env.VOTES_KV.get("count:no"),
  ]);

  return json({ yes: Number(yes) || 0, no: Number(no) || 0, city, region });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

async function votesLog(request, env) {
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/vote") {
      if (request.method === "GET") return voteGet(env);
      if (request.method === "POST") return votePost(request, env);
      return json({ error: "method not allowed" }, 405);
    }

    if (url.pathname === "/api/votes-log" && request.method === "GET") {
      return votesLog(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
