/**
 * Cloudflare Worker — CRM API proxy
 *
 * Forwards requests from Vercel (datacenter IP) through Cloudflare's own
 * network, bypassing CF bot protection that throttles known cloud IPs.
 *
 * Deploy: https://dash.cloudflare.com → Workers & Pages → Create Worker
 * Add env secret WORKER_SECRET in the Worker's Settings → Variables.
 *
 * Required request headers from the Next.js proxy:
 *   X-Target-URL    — full CRM endpoint URL to forward to
 *   X-Worker-Secret — must match the WORKER_SECRET env var
 */
export default {
  async fetch(request, env) {
    const secret = request.headers.get('X-Worker-Secret');
    if (!env.WORKER_SECRET || secret !== env.WORKER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const targetUrl = request.headers.get('X-Target-URL');
    if (!targetUrl) {
      return new Response('Missing X-Target-URL header', { status: 400 });
    }

    const headers = new Headers(request.headers);
    headers.delete('X-Worker-Secret');
    headers.delete('X-Target-URL');

    const upstream = new Request(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== 'GET' ? request.body : undefined,
    });

    return fetch(upstream);
  }
};
