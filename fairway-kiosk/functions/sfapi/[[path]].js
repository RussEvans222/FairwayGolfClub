// Cloudflare Pages Function — proxy /sfapi/* to Salesforce
// Runs server-side so there's no CORS issue from the browser.
// The SF instance URL comes from the Authorization header's token domain,
// but we use the configured env var to keep it simple.

export async function onRequest(context) {
  const { request, env } = context
  const instanceUrl = env.VITE_SF_INSTANCE_URL || 'https://storm-bd727290084d27.my.salesforce.com'

  const url = new URL(request.url)
  // Strip /sfapi prefix and forward the rest to Salesforce
  const sfPath = url.pathname.replace(/^\/sfapi/, '') + url.search
  const sfUrl = `${instanceUrl}${sfPath}`

  const headers = new Headers(request.headers)
  headers.delete('host')

  const sfRes = await fetch(sfUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })

  const resHeaders = new Headers(sfRes.headers)
  resHeaders.set('Access-Control-Allow-Origin', '*')

  return new Response(sfRes.body, {
    status: sfRes.status,
    headers: resHeaders,
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  })
}
