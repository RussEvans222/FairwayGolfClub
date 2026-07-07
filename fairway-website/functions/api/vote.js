// Cloudflare Pages Function — homepage "Does this sound cool?" survey.
// Requires a KV namespace bound as VOTES_KV in the Pages project settings.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.VOTES_KV) return json({ error: "not configured" }, 500);

  const [yes, no] = await Promise.all([
    env.VOTES_KV.get("count:yes"),
    env.VOTES_KV.get("count:no"),
  ]);
  return json({ yes: Number(yes) || 0, no: Number(no) || 0 });
}

export async function onRequestPost(context) {
  const { env, request } = context;
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
