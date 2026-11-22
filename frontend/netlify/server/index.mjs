import { isIP } from 'node:net';

export const config = { path: '/api/*' };

const portalCookies = new Set(['cq_auth_token', 'XSRF-TOKEN', 'cq_submitted']);
const apiPath = /^\/api\/(?:auth|admin|public)(?:\/|$)/;

function backendUrl() {
  try {
    const url = new URL(process.env.QUIZ_BACKEND_URL);
    if (url.protocol === 'https:' && !url.username && !url.password &&
        !url.search && !url.hash && /^\/(?:api\/?)?$/.test(url.pathname)) {
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

function isPortalCookie(cookie) {
  return portalCookies.has(cookie.trimStart().split('=', 1)[0]);
}

function apiError(status, message) {
  return Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default async function proxyApi(request, context) {
  const incoming = new URL(request.url);
  if (!apiPath.test(incoming.pathname)) return apiError(404, 'API endpoint not found.');

  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site' || fetchSite === 'same-site' ||
      (origin !== null && origin !== incoming.origin && fetchSite !== 'same-origin')) {
    return apiError(403, 'Cross-origin API requests are not allowed.');
  }

  const upstream = backendUrl();
  if (!upstream || upstream.origin === incoming.origin) {
    return apiError(503, 'The quiz API is not configured for this deployment.');
  }
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;

  const headers = new Headers();
  for (const name of ['accept', 'authorization', 'content-type', 'x-xsrf-token']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const cookies = (request.headers.get('cookie') ?? '').split(';').filter(isPortalCookie);
  if (cookies.length) headers.set('cookie', cookies.map((cookie) => cookie.trim()).join('; '));
  if (isIP(context?.ip ?? '')) headers.set('x-forwarded-for', context.ip);

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.body,
      duplex: 'half',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (response.body && !/^(?:application\/(?:json|problem\+json)|image\/png)(?:;|$)/i.test(contentType)) {
      await response.body.cancel();
      return apiError(502, 'The quiz backend returned an unexpected response.');
    }

    const responseHeaders = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    for (const name of ['content-type', 'content-disposition', 'retry-after']) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    for (const cookie of response.headers.getSetCookie()) {
      if (isPortalCookie(cookie)) responseHeaders.append('set-cookie', cookie);
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return apiError(502, 'The quiz backend is unavailable. Please try again shortly.');
  }
}
